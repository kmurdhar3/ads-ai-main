import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getMostRecentBrandId } from "@/lib/db/brand-context";
import { getBrandContext } from "@/lib/db/brand-context";
import { getProducts } from "@/lib/db/products";
import { getMetaAds } from "@/lib/db/meta-ads";
import { saveConcept } from "@/lib/db/concepts";
import { generateReplicaAdConcept } from "@/lib/claude";
import { generateAdImage } from "@/lib/kie-ai";
import { evaluateCreative } from "@/lib/quality-control";
import { readKnowledge, readKnowledgeMarkdown, readAnalysis } from "@/lib/csv";
import { createServerClient } from "@supabase/ssr";
import { HookAnalysis } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { conceptId } = body;

  if (!conceptId) {
    return NextResponse.json({ error: "conceptId required" }, { status: 400 });
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const brandId = await getMostRecentBrandId(user.id);
  if (!brandId) {
    return NextResponse.json({ error: "No brand found" }, { status: 400 });
  }

  // Fetch original concept
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return req.cookies.getAll() }, setAll() {} } }
  );

  const { data: originalConcept, error: fetchError } = await supabase
    .from("concepts")
    .select("*")
    .eq("id", conceptId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !originalConcept) {
    return NextResponse.json({ error: "Concept not found" }, { status: 404 });
  }

  // Load brand context, products, meta ads
  const [brandContext, products, metaAds] = await Promise.all([
    getBrandContext(user.id, brandId),
    getProducts(user.id, brandId),
    getMetaAds(user.id, brandId),
  ]);

  if (!brandContext) {
    return NextResponse.json({ error: "No brand context" }, { status: 400 });
  }

  // Find the reference ad
  const referenceAdId = originalConcept.inspiration_ad_ids?.split(",")[0];
  const referenceAd = metaAds.find((ad) => ad.id === referenceAdId);

  if (!referenceAd) {
    return NextResponse.json({ error: "Reference ad not found" }, { status: 400 });
  }

  // Find the product
  const product = products.find((p) => p.name === originalConcept.product_name) || null;

  // Load knowledge and hook analysis
  const knowledge = readKnowledge();
  const knowledgeTactics = knowledge
    .map((k) => {
      const markdown = readKnowledgeMarkdown(k.id);
      return markdown || k.tactics || k.summary;
    })
    .join("\n\n---\n\n")
    .slice(0, 8000);

  const analysisResult = readAnalysis();
  const hookMap = new Map<string, HookAnalysis>();
  if (analysisResult?.hooks) {
    for (const hook of analysisResult.hooks) {
      hookMap.set(hook.adId, hook);
    }
  }

  const adHook = hookMap.get(referenceAd.id);

  // Generate new concept
  let newConcept = await generateReplicaAdConcept(
    brandContext,
    product,
    referenceAd,
    knowledgeTactics,
    undefined,
    adHook
  );

  // Generate image
  if (newConcept.imagePrompt) {
    try {
      const referenceUrls = referenceAd.imageUrl ? [referenceAd.imageUrl] : [];
      const imageUrl = await generateAdImage(newConcept.imagePrompt, referenceUrls, {
        aspectRatio: "1:1",
      });
      newConcept.generatedImageUrl = imageUrl;
    } catch (e) {
      console.error("Image generation failed:", e);
    }
  }

  // Quality control
  try {
    const qc = await evaluateCreative(newConcept, brandContext, referenceAd, products);
    newConcept.qualityScore = qc.overallScore;
    newConcept.qualityFeedback = qc.feedback;
    newConcept.qcPassed = qc.passed;
  } catch (e) {
    console.error("QC failed:", e);
  }

  // Save with parent reference, same batch, incremented version
  newConcept.id = crypto.randomUUID();
  newConcept.createdAt = new Date().toISOString();

  const { error: insertError } = await supabase.from("concepts").insert({
    id: newConcept.id,
    user_id: user.id,
    brand_context_id: brandId,
    headline: newConcept.headline,
    body: newConcept.body,
    description: newConcept.description || "",
    cta_text: newConcept.ctaText || "",
    image_prompt: newConcept.imagePrompt || "",
    reference_image_url: newConcept.referenceImageUrl || "",
    generated_image_url: newConcept.generatedImageUrl || "",
    video_script: newConcept.videoScript || "",
    ad_type: newConcept.adType || "static",
    target_audience: newConcept.targetAudience || "",
    format: newConcept.format || "",
    placements: newConcept.placements || "",
    rationale: newConcept.rationale || "",
    product_name: newConcept.productName || "",
    inspiration_ad_ids: newConcept.inspirationAdIds || "",
    starred: false,
    quality_score: newConcept.qualityScore || null,
    quality_feedback: newConcept.qualityFeedback || "",
    qc_passed: newConcept.qcPassed !== false,
    batch_id: originalConcept.batch_id,
    parent_concept_id: originalConcept.id,
    version: (originalConcept.version || 1) + 1,
    created_at: newConcept.createdAt,
  });

  if (insertError) {
    console.error("Failed to save regenerated concept:", insertError);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }

  return NextResponse.json(newConcept);
}
