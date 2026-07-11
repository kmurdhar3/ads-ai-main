# Level 1: Meta Bulk-Import Export — Implementation Spec

## What this is
A "Export for Meta" action that turns a batch of generated concepts into a
spreadsheet + image bundle matching Meta Ads Manager's native bulk-import
format (Ads Manager → Import & Export → Import Ads in Bulk), so a user goes
from "recreate everything by hand" to "review a pre-filled import and hit
Publish."

## Important constraint — read before building
Meta's docs are explicit that the bulk-import template's column headers must
be copied exactly — not reconstructed from memory — because a wrong header,
trailing space, or deleted column causes that column to silently fail. The
exact template can also change over time. That means:

- **Do not present this as "one-click, guaranteed to import."** Present it as
  "pre-filled, ready to review" — the user should always do a small test
  import (1-2 rows) before trusting a full batch, exactly as Meta's own
  docs recommend.
- Build the column list below from currently-documented, stable field names.
  If a real import ever fails on a header mismatch, the fix is: user opens
  Ads Manager → Import/Export → **Download Template** (gets Meta's live,
  current template), and we adjust our generator's headers to match. Don't
  treat today's column list as permanently fixed.
- Default every generated row to `Status = PAUSED`. Imported campaigns land
  as drafts either way, but this is a second layer of "nothing goes live
  without a human clicking Publish" — matches the safety posture we agreed
  on for this feature (export, not auto-publish).

---

## Phase 1 — Copy validation & mapping

Before generating anything, validate/prepare each concept's copy against
Meta's known limits:

```ts
const META_LIMITS = { title: 40, body: 125, description: 30 };

function prepareForMeta(concept: AdConcept) {
  return {
    title: concept.headline.slice(0, META_LIMITS.title),
    titleTruncated: concept.headline.length > META_LIMITS.title,
    body: concept.body.slice(0, META_LIMITS.body),
    bodyTruncated: concept.body.length > META_LIMITS.body,
    description: (concept.description || "").slice(0, META_LIMITS.description),
  };
}
```

Surface `titleTruncated`/`bodyTruncated` in the UI (Phase 3) — the user
should know their copy got cut, not discover it after import.

**CTA mapping:** Meta's bulk import expects one of a fixed set of Call to
Action enum values, not free text (e.g. `LEARN_MORE`, `SHOP_NOW`, `SIGN_UP`,
`GET_OFFER`, `CONTACT_US`, `SUBSCRIBE`, `DOWNLOAD`). Your generated
`ctaText` is currently free-form ("Shop Now", "Learn More →", etc.) — add a
small best-effort mapper:

```ts
function mapCtaToMetaEnum(ctaText: string): string {
  const t = ctaText.toLowerCase();
  if (t.includes("shop") || t.includes("buy")) return "SHOP_NOW";
  if (t.includes("sign up")) return "SIGN_UP";
  if (t.includes("download")) return "DOWNLOAD";
  if (t.includes("subscribe")) return "SUBSCRIBE";
  if (t.includes("contact")) return "CONTACT_US";
  if (t.includes("offer") || t.includes("deal")) return "GET_OFFER";
  return "LEARN_MORE"; // safe default
}
```

Flag unmapped/defaulted CTAs in the UI too, so the user can manually fix
just those rows rather than guessing which ones got auto-defaulted.

---

## Phase 2 — Spreadsheet generation

Add `xlsx` (not currently a dependency):
```
npm install xlsx --prefix app
```

New route, takes a `batchId` (reuses `getConceptsByBatch` from the
history/versioning work):

```ts
// app/api/export-meta/route.ts
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const batchId = req.nextUrl.searchParams.get("batchId");
  const concepts = await getConceptsByBatch(user.id, batchId!);
  const brand = await getBrandContext(user.id, /* brandId from query */);

  const rows = concepts.map((c, i) => {
    const prepared = prepareForMeta(c);
    return {
      "Campaign Name": `${brand?.name || "Campaign"} - ${new Date().toISOString().slice(0, 10)}`,
      "Campaign Status": "PAUSED",
      "Ad Set Name": `Ad Set 1`,
      "Ad Set Status": "PAUSED",
      "Ad Name": `${prepared.title} (${i + 1})`,
      "Ad Status": "PAUSED",
      "Title": prepared.title,
      "Body": prepared.body,
      "Description": prepared.description,
      "Call to Action": mapCtaToMetaEnum(c.ctaText),
      "Image File Name": `concept-${i + 1}.png`,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ads");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="meta-import.xlsx"`,
    },
  });
}
```

Note: `Objective` is deliberately omitted — Meta requires it, but your app
has no concept of campaign objective (Awareness/Traffic/Conversions) today.
Leave it blank with a note in the UI telling the user to fill it in before
import, rather than guessing wrong and having the whole batch rejected.

---

## Phase 3 — Bundle image + spreadsheet together

The spreadsheet references images by filename (`Image File Name` column);
Meta's bulk import expects those actual image files uploaded alongside it.
Reuse the zip approach from the export-functionality spec (Phase 3 there):

- Zip contains: `meta-import.xlsx` + `concept-1.png`, `concept-2.png`, etc.
  (filenames must exactly match what's in the spreadsheet column — same
  "exact match, no deviation" constraint Meta applies everywhere in this
  flow)
- This depends on the Supabase Storage image-persistence fix (Phase 0 from
  the export-functionality spec) being live — same dependency as before.

---

## Phase 4 — UI

Add "Export for Meta" as a second option next to "Download batch" (from the
export-functionality work) at the batch level in the history timeline.

Before generating the file, show a small pre-flight summary so nothing is a
surprise on the Meta side:
- "3 of 5 concepts had copy truncated to fit Meta's limits — review before import"
- "2 CTAs were auto-mapped to 'Learn More' — verify these match your intent"
- A reminder: "Campaign Objective isn't set — you'll need to choose this in
  Meta Ads Manager before publishing" + a one-line note to test-import a
  couple of rows first, per Meta's own guidance

---

## Explicitly out of scope for this pass
- Auto-detecting/setting Campaign Objective
- Level 2 (real Marketing API push) — separate spec if you decide to build
  it later
- Handling video-script concepts (video ad bulk-import has its own extra
  requirements) — scope this to static image concepts first

---

## Suggested build order
1. Phase 1 (validation/mapping) — pure logic, testable standalone.
2. Phase 2 (spreadsheet generation) — verify the .xlsx opens cleanly and
   columns look right before wiring images.
3. Phase 3 (zip bundling) — depends on the image-storage fix being live.
4. Phase 4 (UI) — last, once you've done at least one real test-import into
   an actual Meta Ads Manager account to confirm the column headers still
   match what Meta currently expects.
