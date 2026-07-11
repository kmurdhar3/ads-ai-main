import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { getConceptsByBatch } from "@/lib/db/concepts";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { prepareForMeta, mapCtaToMetaEnum } from "@/lib/meta-export";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const batchId = req.nextUrl.searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json(
        { error: "Missing required parameter: batchId" },
        { status: 400 }
      );
    }

    // Get most recent brand context ID (same pattern as batches route)
    const brandContextId = await getMostRecentBrandId(user.id);
    if (!brandContextId) {
      return NextResponse.json({ error: "No brand context found" }, { status: 404 });
    }

    // Get concepts and brand context
    const concepts = await getConceptsByBatch(user.id, batchId);
    const brandContext = await getBrandContext(user.id, brandContextId);

    if (!brandContext) {
      return NextResponse.json({ error: "Brand context not found" }, { status: 404 });
    }

    if (concepts.length === 0) {
      return NextResponse.json({ error: "No concepts found in this batch" }, { status: 404 });
    }

    const brandName = brandContext.name || "Campaign";
    const today = new Date().toISOString().slice(0, 10);

    // Generate rows from concepts
    const rows = concepts.map((concept, i) => {
      const prepared = prepareForMeta({
        headline: concept.headline,
        body: concept.body,
        description: concept.description,
        ctaText: concept.ctaText,
      });

      const [ctaEnum] = mapCtaToMetaEnum(concept.ctaText);

      return {
        "Campaign Name": `${brandName} - ${today}`,
        "Campaign Status": "PAUSED",
        "Ad Set Name": "Ad Set 1",
        "Ad Set Status": "PAUSED",
        "Ad Name": `${prepared.title} (${i + 1})`,
        "Ad Status": "PAUSED",
        "Title": prepared.title,
        "Body": prepared.body,
        "Description": prepared.description,
        "Call to Action": ctaEnum,
        "Image File Name": `concept-${i + 1}.png`,
      };
    });

    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ads");
    const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Create zip bundle with spreadsheet + images
    const zip = new JSZip();
    zip.file("meta-import.xlsx", xlsxBuffer);

    // Add concept images with exact filenames matching the spreadsheet
    for (const [i, concept] of concepts.entries()) {
      if (concept.generatedImageUrl) {
        try {
          const res = await fetch(concept.generatedImageUrl);
          if (res.ok) {
            const imageBuffer = await res.arrayBuffer();
            // Filename must exactly match the "Image File Name" column
            zip.file(`concept-${i + 1}.png`, imageBuffer);
          }
        } catch (e) {
          console.error(`Failed to fetch image for concept ${i + 1}:`, e);
          // Continue with other images even if one fails
        }
      }
    }

    // Generate zip file
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });

    return new NextResponse(Buffer.from(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="meta-import-${today}.zip"`,
      },
    });
  } catch (error) {
    console.error("Export Meta error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
