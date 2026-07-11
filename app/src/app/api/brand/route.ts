import { NextRequest, NextResponse } from "next/server";
import { readBrandContext, readBrand, readProducts, writeBrand, writeBrandContext, writeProducts } from "@/lib/csv";
import { BrandContext } from "@/lib/types";
import {
  crawlWebsite,
  extractBrandProfile,
  extractProducts,
  extractImageUrls,
  extractProductImageMap,
  downloadBrandAssets,
  downloadFile,
} from "@/lib/firecrawl";
import { scrapeInstagramProfile, scrapeYouTubeChannel } from "@/lib/apify";
import {
  analyzeBrandIdentity,
  extractProductsWithClaude,
} from "@/lib/claude";
import { analyzeYouTubeContent } from "@/lib/claude-youtube";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");

export const maxDuration = 300;

function clearBrandAssets() {
  const assetsDir = path.join(DATA_DIR, "brand-assets");
  if (!fs.existsSync(assetsDir)) return;
  for (const file of fs.readdirSync(assetsDir)) {
    if (/^(web-|ig-|favicon\.|profile-pic\.)/.test(file)) {
      fs.unlinkSync(path.join(assetsDir, file));
    }
  }
}

function clearDownstreamData() {
  const filesToRemove = [
    "search-results.json",
    "analysis.json",
    "meta-ads.csv",
    "concepts.csv",
  ];
  for (const f of filesToRemove) {
    const fp = path.join(DATA_DIR, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  const dirsToClean = ["competitor-ads", "generated-images"];
  for (const dir of dirsToClean) {
    const dp = path.join(DATA_DIR, dir);
    if (fs.existsSync(dp)) {
      fs.rmSync(dp, { recursive: true, force: true });
      fs.mkdirSync(dp, { recursive: true });
    }
  }
}

export async function GET(req: NextRequest) {
  // Prefer authenticated user data from Supabase when available
  try {
    const { getAuthenticatedUser } = await import("@/lib/auth-server");
    const user = await getAuthenticatedUser();

    if (user) {
      const { getBrandContext, getMostRecentBrandId } = await import("@/lib/db/brand-context");
      const { getProducts } = await import("@/lib/db/products");

      // Accept ?brandId= query param with fallback to most recent
      const { searchParams } = new URL(req.url);
      let brandId = searchParams.get("brandId");

      if (!brandId) {
        brandId = await getMostRecentBrandId(user.id);
      }

      if (!brandId) {
        return NextResponse.json({ brand: null, brandContext: null, products: [], assets: [] });
      }

      const brandContext = await getBrandContext(user.id, brandId);
      const products = await getProducts(user.id, brandId);

      let assets: string[] = [];
      const assetsDir = path.join(DATA_DIR, "brand-assets");
      if (fs.existsSync(assetsDir)) {
        assets = fs
          .readdirSync(assetsDir)
          .filter((f) => /^(web-|ig-|asset-).*\.(png|jpg|jpeg|webp|svg)$/i.test(f));
      }

      const brand = brandContext
        ? {
            name: brandContext.name,
            url: brandContext.url || "",
            description: brandContext.description,
            tagline: brandContext.tagline || "",
            products: "",
            colors: brandContext.colors || "",
            logoUrl: brandContext.logoUrl || "",
            faviconUrl: brandContext.faviconUrl || "",
            style: brandContext.style || "",
            instagramHandle: brandContext.instagramHandle || "",
            instagramFollowers: String(brandContext.instagramFollowers || ""),
            instagramProfilePicUrl: brandContext.instagramProfilePicUrl || "",
          }
        : null;

      return NextResponse.json({ brand, brandContext, products, assets });
    }
  } catch (e) {
    // ignore and fallback to file-based legacy behavior
  }

  const brandContext = readBrandContext();
  const legacyBrand = readBrand();
  const products = readProducts();

  let assets: string[] = [];
  const assetsDir = path.join(DATA_DIR, "brand-assets");
  if (fs.existsSync(assetsDir)) {
    assets = fs
      .readdirSync(assetsDir)
      .filter((f) => /^(web-|ig-|asset-).*\.(png|jpg|jpeg|webp|svg)$/i.test(f));
  }

  // Return brand context if available, otherwise fall back to legacy
  const brand = brandContext ? {
    name: brandContext.name,
    url: brandContext.url || "",
    description: brandContext.description,
    tagline: brandContext.tagline || "",
    products: "",
    colors: brandContext.colors || "",
    logoUrl: brandContext.logoUrl || "",
    faviconUrl: brandContext.faviconUrl || "",
    style: brandContext.style || "",
    instagramHandle: brandContext.instagramHandle || "",
    instagramFollowers: String(brandContext.instagramFollowers || ""),
    instagramProfilePicUrl: brandContext.instagramProfilePicUrl || "",
  } : legacyBrand;

  return NextResponse.json({ brand, brandContext, products, assets });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const websiteUrl: string = body.websiteUrl || "";
  const instagramHandle: string = body.instagramHandle || "";
  const youtubeUrl: string = body.youtubeUrl || "";
  const youtubeVideoCount: number = Math.min(
    Math.max(parseInt(body.youtubeVideoCount, 10) || 3, 1),
    10
  );

  if (!websiteUrl) {
    return NextResponse.json({ error: "websiteUrl is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const errors: string[] = [];

      function emit(step: string, message: string, progress: number, extra?: Record<string, any>) {
        const data = JSON.stringify({ step, message, progress, errors: [...errors], ...extra });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      }

      try {
        clearBrandAssets();
        clearDownstreamData();

        emit("crawling", `Crawling website: ${websiteUrl}`, 5);
        const { pages } = await crawlWebsite(websiteUrl, 15);
        emit("crawled", `Crawled ${pages.length} pages`, 15);

        const metaBrand = extractBrandProfile(pages, websiteUrl);
        const metaProducts = extractProducts(pages);

        const allContent = pages
          .map((p) => p.markdown || p.data?.markdown || "")
          .join("\n\n");

        emit("favicon", "Downloading favicon...", 18);
        const faviconExt = "ico";
        const faviconFile = await downloadFile(metaBrand.faviconUrl, `favicon.${faviconExt}`);
        if (!faviconFile) {
          const pngFavicon = await downloadFile(
            new URL("/favicon.png", websiteUrl).href,
            "favicon.png"
          );
          if (pngFavicon) metaBrand.faviconUrl = new URL("/favicon.png", websiteUrl).href;
        }

        emit("analyzing", "Analyzing brand identity with AI...", 22);
        let analysis: Awaited<ReturnType<typeof analyzeBrandIdentity>> | null = null;
        try {
          analysis = await analyzeBrandIdentity(allContent, "", websiteUrl);
        } catch (e) {
          errors.push(`Brand analysis failed: ${e}`);
        }

        emit("products", "Extracting products with AI...", 35);
        const productImageMapData = extractProductImageMap(pages);
        let claudeProducts: Awaited<ReturnType<typeof extractProductsWithClaude>> = [];
        try {
          claudeProducts = await extractProductsWithClaude(allContent, productImageMapData);
        } catch (e) {
          errors.push(`Product extraction failed: ${e}`);
        }

        emit("web-images", "Downloading website visuals...", 42);
        const webImageUrls = extractImageUrls(pages);
        const webSaved = await downloadBrandAssets(webImageUrls.slice(0, 15), "web");
        emit("web-images-done", `Downloaded ${webSaved.length} website images`, 48);

        const brand = {
          ...metaBrand,
          name: analysis?.name || metaBrand.name,
          description: analysis?.description || metaBrand.description,
          tagline: analysis?.tagline || metaBrand.tagline,
          colors: analysis?.colors || metaBrand.colors,
          style: analysis?.style || metaBrand.style,
          logoUrl: metaBrand.logoUrl || webImageUrls[0] || "",
          instagramHandle: instagramHandle || metaBrand.instagramHandle,
          instagramFollowers: metaBrand.instagramFollowers,
          instagramProfilePicUrl: "",
        };

        const products = claudeProducts.length > 0 ? claudeProducts : metaProducts;

        let youtubeData: Awaited<ReturnType<typeof scrapeYouTubeChannel>> | null = null;
        let youtubeAnalysis: Awaited<ReturnType<typeof analyzeYouTubeContent>> | null = null;

        if (instagramHandle) {
          emit("instagram", `Scraping Instagram: @${instagramHandle}`, 55);
          try {
            const igProfile = await scrapeInstagramProfile(instagramHandle);
            brand.instagramHandle = igProfile.username;
            brand.instagramFollowers = igProfile.followersCount.toString();
            if (!brand.description && igProfile.biography) {
              brand.description = igProfile.biography;
            }

            if (igProfile.profilePicUrl) {
              emit("profile-pic", "Downloading profile picture...", 62);
              const ext = igProfile.profilePicUrl.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || "jpg";
              const picFile = await downloadFile(igProfile.profilePicUrl, `profile-pic.${ext}`);
              if (picFile) {
                brand.instagramProfilePicUrl = igProfile.profilePicUrl;
              }
            }

            const igAssets = igProfile.posts
              .filter((p) => p.imageUrl)
              .map((p) => p.imageUrl);
            if (igAssets.length > 0) {
              emit("ig-assets", `Downloading ${Math.min(igAssets.length, 12)} Instagram images...`, 68);
              const igSaved = await downloadBrandAssets(igAssets.slice(0, 12), "ig");
              emit("ig-assets-done", `Downloaded ${igSaved.length} Instagram images`, 78);
            }
          } catch (e) {
            errors.push(`Instagram scrape failed: ${e}`);
          }
        }

        if (youtubeUrl) {
          emit("youtube", `Scraping YouTube channel...`, 80);
          try {
            youtubeData = await scrapeYouTubeChannel(youtubeUrl, youtubeVideoCount);
            if (!brand.description && youtubeData.description) {
              brand.description = youtubeData.description;
            }
            emit("youtube-scraped", `Scraped ${youtubeData.videos.length} videos from ${youtubeData.channelName}`, 82);

            // Analyze video content if we have transcripts
            if (youtubeData.videos.length > 0) {
              emit("youtube-analyzing", `Analyzing video content with AI...`, 84);
              try {
                youtubeAnalysis = await analyzeYouTubeContent(
                  youtubeData.channelName,
                  youtubeData.videos.map(v => ({
                    title: v.title,
                    transcript: v.transcript || "",
                    viewCount: v.viewCount,
                  }))
                );
                emit("youtube-analyzed", `Analyzed ${youtubeData.videos.length} videos for brand themes`, 87);
              } catch (e) {
                errors.push(`YouTube content analysis failed: ${e}`);
              }
            }

            emit("youtube-done", `YouTube analysis complete: ${youtubeData.channelName}`, 90);
          } catch (e) {
            errors.push(`YouTube scrape failed: ${e}`);
          }
        }

        emit("saving", "Saving brand profile...", 92);

        // If authenticated, persist to Supabase per-user; otherwise write legacy CSV
        const { getAuthenticatedUser } = await import("@/lib/auth-server");
        const user = await getAuthenticatedUser();

        const brandContext: BrandContext = {
          name: brand.name,
          url: websiteUrl,
          description: brand.description,
          tagline: brand.tagline,
          category: products.length > 0 ? (products[0].category || "") : "",
          keywords: products.map((p) => p.name).filter(Boolean).slice(0, 6),
          colors: brand.colors,
          style: brand.style,
          instagramHandle: brand.instagramHandle || undefined,
          instagramFollowers: brand.instagramFollowers ? Number(brand.instagramFollowers) : undefined,
          instagramProfilePicUrl: brand.instagramProfilePicUrl || undefined,
          logoUrl: brand.logoUrl || undefined,
          faviconUrl: brand.faviconUrl || undefined,
          youtubeChannelName: youtubeData?.channelName || undefined,
          youtubeChannelUrl: youtubeData?.channelUrl || undefined,
          youtubeSubscribers: youtubeData?.subscriberCount || undefined,
          youtubeContentAnalysis: youtubeAnalysis || undefined,
          sources: [
            { type: "website", url: websiteUrl, description: `Crawled ${pages.length} pages` },
            ...(instagramHandle ? [{ type: "instagram", url: `https://instagram.com/${instagramHandle}`, description: `@${instagramHandle}` }] : []),
            ...(youtubeUrl && youtubeData ? [{ type: "youtube", url: youtubeData.channelUrl, description: `${youtubeData.channelName} (${youtubeData.videos.length} videos analyzed)` }] : []),
          ],
          collectedAt: new Date().toISOString(),
          collectedBy: "web-form",
        };
        let savedBrandId: string | null = null;
        if (user) {
          const { saveBrandContext } = await import("@/lib/db/brand-context");
          const { saveProducts } = await import("@/lib/db/products");

          const { brandId } = await saveBrandContext(user.id, brandContext);
          savedBrandId = brandId;
          await saveProducts(user.id, brandId, products);
        } else {
          // Write legacy CSV
          await writeBrand(brand);
          await writeProducts(products);

          // Also write new JSON brand context
          await writeBrandContext(brandContext);
        }

        emit(
          "done",
          `Brand profile saved: ${brand.name} (${products.length} products)`,
          100,
          { brandId: savedBrandId }
        );
      } catch (e) {
        emit("error", `Brand scraping failed: ${e}`, 0);
      } finally {
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
