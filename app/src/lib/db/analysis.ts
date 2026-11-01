import { createClient } from "@/lib/supabase/server";
import { AnalysisResult } from "@/lib/types";

/** Latest "What's Working" analysis for a brand, or null if none has been run. */
export async function getLatestAnalysis(userId: string, brandContextId: string): Promise<AnalysisResult | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("analysis_results")
    .select("raw_data")
    .eq("user_id", userId)
    .eq("brand_context_id", brandContextId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[analysis] Failed to load analysis:", error);
    return null;
  }
  return (data?.raw_data as AnalysisResult) ?? null;
}
