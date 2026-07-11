import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getConceptsByBatch } from "@/lib/db/concepts";

export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batchId = req.nextUrl.searchParams.get("batchId");

  if (!batchId) {
    return NextResponse.json({ error: "batchId parameter required" }, { status: 400 });
  }

  try {
    const concepts = await getConceptsByBatch(user.id, batchId);

    if (concepts.length === 0) {
      return NextResponse.json({ error: "No concepts found in this batch" }, { status: 404 });
    }

    const zip = new JSZip();
    const copyLines: string[] = [];

    // Add each concept's image and copy
    for (const [i, concept] of concepts.entries()) {
      if (concept.generatedImageUrl) {
        try {
          const res = await fetch(concept.generatedImageUrl);
          if (res.ok) {
            const buffer = await res.arrayBuffer();
            zip.file(`concept-${i + 1}.png`, buffer);
          }
        } catch (e) {
          console.error(`Failed to fetch image for concept ${i + 1}:`, e);
        }
      }

      copyLines.push(
        `Concept ${i + 1}: ${concept.headline}\n${concept.body}\nCTA: ${concept.ctaText}\n\n`
      );
    }

    // Add ad copy text file
    zip.file("ad-copy.txt", copyLines.join(""));

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    return new NextResponse(Buffer.from(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="batch-export.zip"`,
      },
    });
  } catch (e) {
    console.error("Batch export failed:", e);
    return NextResponse.json({ error: "Failed to export batch" }, { status: 500 });
  }
}
