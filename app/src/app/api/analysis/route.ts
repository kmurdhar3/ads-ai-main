import { NextResponse } from "next/server";
import { readAnalysis, writeAnalysis, readMetaAds, readBrandContext } from "@/lib/csv";
import { analyzeWinningPatterns } from "@/lib/claude";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getMetaAds } from "@/lib/db/meta-ads";
import { getBrandContext } from "@/lib/db/brand-context";
import { createServerClient } from "@supabase/ssr";

export const maxDuration = 120;

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return [] }, setAll() {} } }
      );

      const { data } = await supabase
        .from("analysis_results")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      return NextResponse.json(data || null);
    }
  } catch (e) {
    // fallback
  }

  const analysis = readAnalysis();
  return NextResponse.json(analysis);
}

export async function POST() {
  // Prefer DB-backed data when authenticated
  const user = await getAuthenticatedUser();
  let brandContext = null;
  let metaAds = [];

  if (user) {
    brandContext = await getBrandContext(user.id);
    metaAds = await getMetaAds(user.id);
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

  const analysis = await analyzeWinningPatterns(metaAds, brandContext);

  if (user) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return [] }, setAll() {} } }
      );
      await supabase.from("analysis_results").insert({
        user_id: user.id,
        raw_data: analysis,
        patterns: analysis.patterns || [],
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // ignore
    }
  } else {
    await writeAnalysis(analysis);
  }

  return NextResponse.json(analysis);
}
