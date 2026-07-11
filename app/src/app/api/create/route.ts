import { NextRequest, NextResponse } from "next/server";
import { readBrandContext, readBrand, readProducts, readKnowledge, readMetaAds, appendConcepts, readConcepts, writeConcepts, readKnowledgeMarkdown } from "@/lib/csv";
import { generateAdConcept } from "@/lib/claude";
import { generateAdImage } from "@/lib/kie-ai";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getConcepts, updateConceptStar, saveConcept } from "@/lib/db/concepts";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { getProducts } from "@/lib/db/products";
import { getMetaAds } from "@/lib/db/meta-ads";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    // Fallback to file system for non-authenticated access
    const concepts = readConcepts();
    return NextResponse.json(concepts);
  }

  // User-scoped data from Supabase
  const brandId = await getMostRecentBrandId(user.id);
  if (!brandId) {
    return NextResponse.json([]);
  }
  const concepts = await getConcepts(user.id, brandId);
  return NextResponse.json(concepts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productName, format, targetAudience, style } = body;

  const user = await getAuthenticatedUser();
  let brandContext = null;
  let legacyBrand = null;
  let brandId: string | null = null;

  if (user) {
    brandId = await getMostRecentBrandId(user.id);
    if (!brandId) {
      return NextResponse.json(
        { error: "No brand profile found. Set up your brand first." },
        { status: 400 }
      );
    }
    brandContext = await getBrandContext(user.id, brandId);
  } else {
    legacyBrand = readBrand();
    brandContext = readBrandContext();
  }
  const brand = brandContext || legacyBrand;

  if (!brand) {
    return NextResponse.json(
      { error: "No brand profile found. Set up your brand first." },
      { status: 400 }
    );
  }

  let products = [];
  if (user && brandId) products = await getProducts(user.id, brandId);
  else products = readProducts();

  const knowledge = readKnowledge();
  let metaAds = [];
  if (user && brandId) metaAds = await getMetaAds(user.id, brandId);
  else metaAds = readMetaAds();

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

  // Persist concept to DB for authenticated users, otherwise append to file
  if (user && brandId) {
    try {
      await saveConcept(user.id, brandId, concept as any);
    } catch (e) {
      // fallback to file
      await appendConcepts([concept]);
    }
  } else {
    await appendConcepts([concept]);
  }

  return NextResponse.json(concept);
}

export async function PATCH(req: NextRequest) {
  const { id, starred } = await req.json();
  const user = await getAuthenticatedUser();

  if (!user) {
    // Fallback to file system
    const concepts = readConcepts();
    const idx = concepts.findIndex((c) => c.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    concepts[idx].starred = starred;
    await writeConcepts(concepts);
    return NextResponse.json(concepts[idx]);
  }

  // User-scoped update in Supabase
  await updateConceptStar(user.id, id, starred);
  const brandId = await getMostRecentBrandId(user.id);
  if (!brandId) {
    return NextResponse.json({ error: "No brand found" }, { status: 404 });
  }
  const concepts = await getConcepts(user.id, brandId);
  const concept = concepts.find((c) => c.id === id);
  return NextResponse.json(concept);
}
