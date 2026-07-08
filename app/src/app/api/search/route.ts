import { NextRequest, NextResponse } from "next/server";
import { readBrandContext, readSearchState, writeSearchState, writeMetaAds } from "@/lib/csv";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { saveMetaAds } from "@/lib/db/meta-ads";
import { createServerClient } from "@supabase/ssr";
import { scrapeMetaAds, downloadAdImage } from "@/lib/apify";
import { scoreAdvertisers, extractKeywords } from "@/lib/competitor-scoring";
import { MetaAdEntry } from "@/lib/types";

export const maxDuration = 300;

const BATCH_SIZE = 3;

export async function GET() {
  // Prefer DB-backed search state when authenticated
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return []; // no-op for server route GET
            },
            setAll() {},
          },
        }
      );

      const { data, error } = await supabase
        .from("search_results")
        .select("*, meta_ads(*)")
        .eq("user_id", user.id)
        .order("searched_at", { ascending: false })
        .limit(1)
        .single();

      if (!data || error) return NextResponse.json(null);

      return NextResponse.json(data);
    }
  } catch (e) {
    // fallback to file
  }

  const state = readSearchState();
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const action: string = body.action || "search";

  if (action === "suggest-keywords") {
    const user = await getAuthenticatedUser();
    let brandContext = null;
    
    if (user) {
      const { getBrandContext } = await import("@/lib/db/brand-context");
      brandContext = await getBrandContext(user.id);
    } else {
      brandContext = readBrandContext();
    }
    
    if (!brandContext) {
      return NextResponse.json({ error: "No brand context found" }, { status: 400 });
    }
    const keywords = extractKeywords(brandContext);
    return NextResponse.json({ keywords });
  }

  if (action === "search") {
    const keywords: string[] = body.keywords || [];
    const adsPerKeyword: number = body.adsPerKeyword || 15;

    if (keywords.length === 0) {
      return NextResponse.json({ error: "No keywords provided" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const allMetaAds: MetaAdEntry[] = [];
        const errors: string[] = [];
        let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

        function emit(data: Record<string, unknown>) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch { /* stream closed */ }
        }

        function startHeartbeat(activeKeywords: string[]) {
          let elapsed = 0;
          heartbeatTimer = setInterval(() => {
            elapsed += 10;
            emit({
              phase: "heartbeat",
              keywords: activeKeywords,
              elapsedSeconds: elapsed,
              message: `Searching ${activeKeywords.length} keywords in parallel... (${elapsed}s)`,
            });
          }, 10_000);
        }

        function stopHeartbeat() {
          if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
          }
        }

        async function processKeyword(keyword: string, index: number): Promise<void> {
          emit({
            phase: "searching",
            keyword,
            index,
            total: keywords.length,
            message: `Searching: "${keyword}"...`,
          });

          try {
            const ads = await scrapeMetaAds(keyword, { limit: adsPerKeyword });

            emit({
              phase: "downloading",
              keyword,
              index,
              total: keywords.length,
              adCount: ads.length,
              message: `Saving ${ads.length} ads for "${keyword}"...`,
            });

            const now = new Date();

            for (const ad of ads) {
              const localPath = await downloadAdImage(ad.imageUrl, ad.advertiserName, ad.id);
              const startDate = ad.startDate ? new Date(ad.startDate) : now;
              const daysRunning = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 86400000));

              allMetaAds.push({
                id: ad.id,
                advertiser: ad.advertiserName,
                headline: ad.headline,
                primaryText: ad.primaryText,
                description: ad.description,
                ctaText: ad.ctaText,
                imageUrl: ad.imageUrl,
                localImagePath: localPath,
                videoUrl: ad.videoUrl,
                linkUrl: ad.linkUrl,
                platforms: ad.platforms,
                startDate: ad.startDate,
                isActive: ad.isActive,
                daysRunning,
                scrapedAt: now.toISOString(),
              });
            }

            emit({
              phase: "keyword-done",
              keyword,
              index,
              total: keywords.length,
              adsFound: ads.length,
              message: `Found ${ads.length} ads for "${keyword}"`,
            });
          } catch (e) {
            const errMsg = e instanceof Error ? e.message : String(e);
            errors.push(`${keyword}: ${errMsg}`);
            emit({
              phase: "keyword-error",
              keyword,
              index,
              total: keywords.length,
              message: `Failed: "${keyword}" — ${errMsg.slice(0, 120)}`,
            });
          }
        }

        // Process keywords in parallel batches
        for (let batchStart = 0; batchStart < keywords.length; batchStart += BATCH_SIZE) {
          const batch = keywords.slice(batchStart, batchStart + BATCH_SIZE);
          const batchIndices = batch.map((_, i) => batchStart + i);

          startHeartbeat(batch);

          await Promise.all(
            batch.map((keyword, i) => processKeyword(keyword, batchIndices[i]))
          );

          stopHeartbeat();
        }

            if (allMetaAds.length > 0) {
              const user = await getAuthenticatedUser();
              if (user) {
                // Persist meta-ads and search result into Supabase
                await saveMetaAds(user.id, allMetaAds);

                try {
                  const supabase = createServerClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                    { cookies: { getAll() { return req.cookies.getAll() }, setAll() {} } }
                  );
                  const advertisers = scoreAdvertisers(allMetaAds);
                  await supabase.from("search_results").insert({
                    user_id: user.id,
                    keywords,
                    advertisers,
                    total_ads_scraped: allMetaAds.length,
                    searched_at: new Date().toISOString(),
                  });
                } catch (e) {
                  // ignore write errors
                }
              } else {
                await writeMetaAds(allMetaAds);
              }
            }

        emit({ phase: "scoring", message: "Scoring advertisers..." });

        const advertisers = scoreAdvertisers(allMetaAds);

        const searchState = {
          keywords,
          searchedAt: new Date().toISOString(),
          advertisers,
          totalAdsScraped: allMetaAds.length,
        };
        await writeSearchState(searchState);

        emit({
          phase: "done",
          totalAds: allMetaAds.length,
          advertiserCount: advertisers.length,
          topAdvertiser: advertisers[0]?.name || "none",
          errors,
          message: `Complete — ${allMetaAds.length} ads from ${advertisers.length} advertisers`,
        });

        controller.close();
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

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
