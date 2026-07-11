import { createClient } from "@/lib/supabase/client";
import { AdConcept } from "@/lib/types";

export async function getConcepts(userId: string, brandContextId: string): Promise<AdConcept[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    headline: row.headline,
    body: row.body,
    description: row.description || "",
    ctaText: row.cta_text || "",
    imagePrompt: row.image_prompt || "",
    referenceImageUrl: row.reference_image_url || "",
    generatedImageUrl: row.generated_image_url || "",
    videoScript: row.video_script || "",
    adType: row.ad_type as "static" | "video",
    targetAudience: row.target_audience || "",
    format: row.format || "",
    placements: row.placements || "",
    rationale: row.rationale || "",
    productName: row.product_name || "",
    inspirationAdIds: row.inspiration_ad_ids || "",
    starred: row.starred || false,
    qualityScore: row.quality_score,
    qualityFeedback: row.quality_feedback || "",
    qcPassed: row.qc_passed || true,
    createdAt: row.created_at,
  }));
}

export async function saveConcept(userId: string, brandContextId: string, concept: AdConcept): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("concepts")
    .insert({
      brand_context_id: brandContextId,
      user_id: userId,
      headline: concept.headline,
      body: concept.body,
      description: concept.description || "",
      cta_text: concept.ctaText || "",
      image_prompt: concept.imagePrompt || "",
      reference_image_url: concept.referenceImageUrl || "",
      generated_image_url: concept.generatedImageUrl || "",
      video_script: concept.videoScript || "",
      ad_type: concept.adType || "static",
      target_audience: concept.targetAudience || "",
      format: concept.format || "",
      placements: concept.placements || "",
      rationale: concept.rationale || "",
      product_name: concept.productName || "",
      inspiration_ad_ids: concept.inspirationAdIds || "",
      starred: concept.starred || false,
      quality_score: concept.qualityScore,
      quality_feedback: concept.qualityFeedback || "",
      qc_passed: concept.qcPassed !== false,
    });

  if (error) throw error;
}

export async function updateConceptStar(userId: string, conceptId: string, starred: boolean): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("concepts")
    .update({ starred })
    .eq("id", conceptId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function deleteConcepts(userId: string, brandContextId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("concepts")
    .delete()
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId);

  if (error) throw error;
}