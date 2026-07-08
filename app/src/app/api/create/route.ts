import { NextRequest, NextResponse } from "next/server";
import { readBrandContext, readBrand, readProducts, readKnowledge, readMetaAds, appendConcepts, readConcepts, writeConcepts, readKnowledgeMarkdown } from "@/lib/csv";
import { generateAdConcept } from "@/lib/claude";
import { generateAdImage } from "@/lib/kie-ai";

export async function GET() {
  const concepts = readConcepts();
  return NextResponse.json(concepts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productName, format, targetAudience, style } = body;

  const brandContext = readBrandContext();
  const legacyBrand = readBrand();
  const brand = brandContext || legacyBrand;

  if (!brand) {
    return NextResponse.json(
      { error: "No brand profile found. Set up your brand first." },
      { status: 400 }
    );
  }

  const products = readProducts();
  const knowledge = readKnowledge();
  const metaAds = readMetaAds();

  const knowledgeTactics = knowledge
    .map((k) => {
      const markdown = readKnowledgeMarkdown(k.id);
      return markdown || k.tactics || k.summary;
    })
    .join("\n\n---\n\n")
    .slice(0, 8000);

  const concept = await generateAdConcept(brand, products, knowledgeTactics, "", metaAds, {
    productName,
    format,
    targetAudience,
    style,
  });

  if (concept.imagePrompt) {
    try {
      const referenceUrls = concept.referenceImageUrl
        ? [concept.referenceImageUrl]
        : [];
      const imageUrl = await generateAdImage(concept.imagePrompt, referenceUrls, {
        aspectRatio: format === "story" || format === "reel" ? "9:16" : "1:1",
      });
      concept.generatedImageUrl = imageUrl;
    } catch (e) {
      concept.generatedImageUrl = "";
      console.error("Image generation failed:", e);
    }
  }

  await appendConcepts([concept]);
  return NextResponse.json(concept);
}

export async function PATCH(req: NextRequest) {
  const { id, starred } = await req.json();
  const concepts = readConcepts();
  const idx = concepts.findIndex((c) => c.id === id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  concepts[idx].starred = starred;
  await writeConcepts(concepts);
  return NextResponse.json(concepts[idx]);
}
