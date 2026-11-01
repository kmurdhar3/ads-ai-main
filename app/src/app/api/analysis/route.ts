import { NextResponse } from "next/server";
import { readAnalysis, writeAnalysis, readMetaAds, readBrandContext } from "@/lib/csv";
import { analyzeWinningPatterns } from "@/lib/claude";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getMetaAds } from "@/lib/db/meta-ads";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { createClient } from "@/lib/supabase/server";

// Claude's deep hook analysis of 25 ads can take well over 2 minutes.
export const maxDuration = 300;

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      const brandId = await getMostRecentBrandId(user.id);
      if (!brandId) return NextResponse.json(null);

      const supabase = await createClient();
      const { data, error } = await supabase
        .from("analysis_results")
        .select("raw_data")
        .eq("user_id", user.id)
        .eq("brand_context_id", brandId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) console.error("[analysis] Failed to load analysis:", error);
      // raw_data holds the full AnalysisResult (hooks, patterns, summary)
      return NextResponse.json(data?.raw_data ?? null);
    }
  } catch (e) {
    console.error("[analysis] GET error:", e);
  }

  const analysis = readAnalysis();
  return NextResponse.json(analysis);
}

export async function POST() {
  // Prefer DB-backed data when authenticated
  const user = await getAuthenticatedUser();
  let brandContext = null;
  let metaAds = [];
  let brandId: string | null = null;

  if (user) {
    brandId = await getMostRecentBrandId(user.id);
    if (!brandId) {
      return NextResponse.json({ error: "No brand context found" }, { status: 400 });
    }
    brandContext = await getBrandContext(user.id, brandId);
    metaAds = await getMetaAds(user.id, brandId);
  } else {
    brandContext = readBrandContext();
    metaAds = readMetaAds();
  }

  if (!brandContext) {
    return NextResponse.json({ error: "No brand context found" }, { status: 400 });
  }

  if (!metaAds || metaAds.length === 0) {
    return NextResponse.json({ error: "No competitor ads found. Search first." }, { status: 400 });
  }

  let analysis;
  try {
    analysis = await analyzeWinningPatterns(metaAds, brandContext);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[analysis] Claude analysis failed:", e);
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 });
  }

  if (user && brandId) {
    const supabase = await createClient();
    const { error } = await supabase.from("analysis_results").insert({
      user_id: user.id,
      brand_context_id: brandId,
      hooks: analysis.hooks || [],
      patterns: analysis.patterns || [],
      raw_data: analysis,
    });
    if (error) {
      console.error("[analysis] Failed to save analysis:", error);
      // Still return the result so the user sees it, but tell them it wasn't saved.
      return NextResponse.json({ ...analysis, saveError: `Analysis ran but was not saved: ${error.message}` });
    }
  } else {
    await writeAnalysis(analysis);
  }

  return NextResponse.json(analysis);
}
