# Export Functionality — Implementation Spec

## Scope
Let a user get a generated concept's copy + image out of the app:
1. Download a single concept's image
2. Copy a single concept's ad copy (headline/body/CTA) to clipboard
3. Download an entire batch (from the history/versioning work) as a zip:
   images + a text file with all copy, ready to hand to a designer or
   upload into Meta Ads Manager manually

## Prerequisite (Phase 0) — fix image persistence first
`lib/kie-ai.ts`'s `downloadGeneratedImage()` currently writes generated
images to local disk (`data/generated-images/`), served via
`/api/proxy-image?path=...`. **This does not reliably persist on Vercel's
serverless runtime** — the filesystem is ephemeral between invocations.
Building export on top of this means it'll work in local dev and silently
fail or 404 in production.

Fix: store generated images in **Supabase Storage** instead (you already
have a Supabase project wired up — this is a bucket, not a new service).

```ts
// In downloadGeneratedImage(), replace the fs.writeFileSync local save with:
const supabase = await createRouteClient();
const { data, error } = await supabase.storage
  .from("generated-images")
  .upload(`${taskId}.png`, buffer, { contentType: "image/png", upsert: true });

if (error) return null;

const { data: urlData } = supabase.storage
  .from("generated-images")
  .getPublicUrl(`${taskId}.png`);

return urlData.publicUrl;
```

Create the `generated-images` bucket in the Supabase dashboard (Storage →
New bucket), set to public (images aren't sensitive — they're ad creative
meant to be downloaded/published anyway). Once this is live,
`generated_image_url` in the `concepts` table holds a stable, permanent
Supabase Storage URL instead of a local path — this is what makes reliable
export possible at all.

**Note:** this doesn't require a data migration for existing rows — old
concepts keep whatever URL they have (even if broken in production today);
only new generations after this fix get the stable URL.

---

## Phase 1 — Single concept: download image

Simplest possible implementation, no new backend route needed if the
Supabase Storage URL is public (Phase 0): a plain anchor tag with the
`download` attribute.

```tsx
<a
  href={concept.generatedImageUrl}
  download={`${concept.headline.slice(0, 40)}.png`}
  className="..."
>
  <Download className="h-4 w-4" />
</a>
```

One caveat: browsers only honor `download` for same-origin URLs. Since
Supabase Storage is a different origin, this will likely just *open* the
image instead of downloading it. If that's the actual behavior once you
test it, route through a small proxy endpoint instead:

```ts
// app/api/download-image/route.ts
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "ad-image.png";
  const res = await fetch(url!);
  const buffer = await res.arrayBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

---

## Phase 2 — Single concept: copy ad copy

Pure client-side, no backend at all:

```tsx
function copyToClipboard(concept: AdConcept) {
  const text = [
    concept.headline,
    "",
    concept.body,
    "",
    concept.ctaText ? `CTA: ${concept.ctaText}` : "",
  ].filter(Boolean).join("\n");

  navigator.clipboard.writeText(text);
  // trigger a toast: "Copied to clipboard"
}
```

Add this as a button on each concept card next to the existing star action.

---

## Phase 3 — Batch download (zip)

Add `jszip` (no zip library currently in `package.json`):
```
npm install jszip --prefix app
```

New route:

```ts
// app/api/export-batch/route.ts
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  const concepts = await getConceptsByBatch(user.id, batchId!);

  const zip = new JSZip();
  const copyLines: string[] = [];

  for (const [i, c] of concepts.entries()) {
    if (c.generatedImageUrl) {
      const res = await fetch(c.generatedImageUrl);
      const buffer = await res.arrayBuffer();
      zip.file(`concept-${i + 1}.png`, buffer);
    }
    copyLines.push(
      `Concept ${i + 1}: ${c.headline}\n${c.body}\nCTA: ${c.ctaText}\n\n`
    );
  }
  zip.file("ad-copy.txt", copyLines.join(""));

  const blob = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(blob, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="batch-export.zip"`,
    },
  });
}
```

---

## Phase 4 — UI wiring

- Concept card (single, in the grid): download icon + copy icon, both from
  Phase 1/2, added next to the existing star button.
- Batch header (from the history/versioning timeline work): a
  "Download batch" button that hits the Phase 3 endpoint with that batch's
  `batchId`.

---

## Explicitly out of scope for this pass
- CSV export of copy data (structured spreadsheet) — easy add-on later if
  you want it, same shape as the zip's `ad-copy.txt` but as a proper CSV
- Direct push to Meta Ads Manager — separate, much larger integration
  (real API auth, campaign structure, review flow) — not part of "export,"
  worth its own spec later if you want it

---

## Suggested build order
1. Phase 0 (image persistence fix) — do this first regardless of the rest;
   it's a standing production bug independent of export.
2. Phase 1 + 2 (single-concept download/copy) — small, test the
   same-origin download issue here before building the zip flow on top of
   whichever approach works.
3. Phase 3 (batch zip) — depends on Phase 0 being live so images actually
   fetch correctly server-side.
4. Phase 4 (UI) — wire buttons in last.
