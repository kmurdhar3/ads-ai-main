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

  // Claude can take 3-4 minutes here. Stream SSE with a heartbeat every 10s so
  // the connection never sits idle long enough to be dropped ("Failed to fetch").
  const encoder = new TextEncoder();
  const ads = metaAds;
  const brand = brandContext;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream closed */ }
      };

      const startedAt = Date.now();
      emit({ phase: "analyzing", elapsedSeconds: 0 });
      const heartbeat = setInterval(() => {
        emit({ phase: "heartbeat", elapsedSeconds: Math.round((Date.now() - startedAt) / 1000) });
      }, 10_000);

      try {
        const analysis = await analyzeWinningPatterns(ads, brand);
        let saveError: string | undefined;

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
            saveError = `Analysis ran but was not saved: ${error.message}`;
          }
        } else {
          await writeAnalysis(analysis);
        }

        emit({ phase: "done", analysis, saveError });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[analysis] Claude analysis failed:", e);
        emit({ phase: "error", message: `Analysis failed: ${msg}` });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
