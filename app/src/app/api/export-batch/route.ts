import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getConcepts, getConceptsByBatch } from "@/lib/db/concepts";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { AdConcept } from "@/lib/types";

export const maxDuration = 120;

/**
 * Export concepts as a ZIP with everything needed to reuse them elsewhere:
 *   concepts.md    readable brief of every concept (copy, script, strategy)
 *   concepts.json  the same data, machine-readable
 *   images/        generated ad images
 *   references/    the competitor ads each concept was modeled on
 *
 * ?batchId=...  one batch
 * ?all=1        every concept for the current brand
 */
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = req.nextUrl.searchParams.get("batchId");
  const all = req.nextUrl.searchParams.get("all") === "1";
  if (!batchId && !all) {
    return NextResponse.json({ error: "batchId or all=1 required" }, { status: 400 });
  }

  try {
    const brandId = await getMostRecentBrandId(user.id);
    const brand = brandId ? await getBrandContext(user.id, brandId) : null;
    const brandName = brand?.name || "Brand";

    let concepts: AdConcept[];
    if (all) {
      if (!brandId) return NextResponse.json({ error: "No brand found" }, { status: 404 });
      concepts = await getConcepts(user.id, brandId);
    } else {
      concepts = await getConceptsByBatch(user.id, batchId!);
    }

    // Oldest first so numbering follows the order they were made
    concepts = [...concepts].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    if (concepts.length === 0) {
      return NextResponse.json({ error: "No concepts found" }, { status: 404 });
    }

    const zip = new JSZip();
    const pad = (n: number) => String(n).padStart(2, "0");

    // Fetch all images in parallel; a missing image never fails the export
    async function fetchImage(url: string): Promise<{ data: ArrayBuffer; ext: string } | null> {
      if (!url) return null;
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const type = res.headers.get("content-type") || "";
        const ext = type.includes("jpeg") || type.includes("jpg") ? "jpg" : type.includes("webp") ? "webp" : "png";
        return { data: await res.arrayBuffer(), ext };
      } catch {
        return null;
      }
    }

    const images = await Promise.all(
      concepts.map(async (c) => ({
        generated: await fetchImage(c.generatedImageUrl),
        reference: await fetchImage(c.referenceImageUrl),
      }))
    );

    const records = concepts.map((c, i) => {
      const n = pad(i + 1);
      const img = images[i];
      const imageFile = img.generated ? `images/concept-${n}.${img.generated.ext}` : null;
      const referenceFile = img.reference ? `references/concept-${n}-reference.${img.reference.ext}` : null;
      if (img.generated && imageFile) zip.file(imageFile, img.generated.data);
      if (img.reference && referenceFile) zip.file(referenceFile, img.reference.data);

      const referenceAdIds = (c.inspirationAdIds || "").split(",").map((s) => s.trim()).filter(Boolean);
      return {
        number: i + 1,
        id: c.id,
        batchId: c.batchId || null,
        createdAt: c.createdAt,
        adType: c.adType || "static",
        product: c.productName || null,
        headline: c.headline,
        primaryText: c.body,
        description: c.description,
        cta: c.ctaText,
        videoScript: c.videoScript || null,
        targetAudience: c.targetAudience,
        format: c.format,
        placements: c.placements,
        strategy: c.rationale,
        imagePrompt: c.imagePrompt,
        imageFile,
        imageUrl: c.generatedImageUrl || null,
        referenceFile,
        referenceAdLinks: referenceAdIds.map((id) => `https://www.facebook.com/ads/library/?id=${id}`),
        starred: c.starred,
      };
    });

    zip.file("concepts.json", JSON.stringify({ brand: brandName, exportedAt: new Date().toISOString(), concepts: records }, null, 2));

    const section = (title: string, text?: string | null) =>
      text && text.trim() ? `**${title}:**\n\n${text.trim()}\n\n` : "";

    const md = [
      `# ${brandName} — Ad Concepts\n`,
      `${records.length} concepts · exported ${new Date().toISOString().slice(0, 10)}\n`,
      `Images are in \`images/\`; the competitor ads they were modeled on are in \`references/\`. The same data is in \`concepts.json\`.\n`,
      ...records.map((r) =>
        [
          `---\n\n## Concept ${r.number}: ${r.headline}\n\n`,
          `- **Type:** ${r.adType === "video" ? "Video" : "Static"}\n`,
          r.product ? `- **Product:** ${r.product}\n` : "",
          r.cta ? `- **CTA:** ${r.cta}\n` : "",
          r.format ? `- **Format:** ${r.format}\n` : "",
          r.placements ? `- **Placements:** ${r.placements}\n` : "",
          r.imageFile ? `- **Image:** \`${r.imageFile}\`\n` : "",
          r.referenceFile ? `- **Reference ad:** \`${r.referenceFile}\`\n` : "",
          ...r.referenceAdLinks.map((l) => `- **Ad Library:** ${l}\n`),
          `\n`,
          section("Primary text", r.primaryText),
          section("Link description", r.description),
          section("Video script", r.videoScript),
          section("Target audience", r.targetAudience),
          section("Strategy", r.strategy),
          section("Image prompt", r.imagePrompt),
        ].join("")
      ),
    ].join("\n");
    zip.file("concepts.md", md);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "brand";
    const filename = all ? `${slug}-all-concepts.zip` : `${slug}-batch-concepts.zip`;

    return new NextResponse(Buffer.from(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("Batch export failed:", e);
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message || String(e);
    return NextResponse.json({ error: `Export failed: ${msg}` }, { status: 500 });
  }
}
