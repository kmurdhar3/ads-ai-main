import {
  crawlWebsite,
  extractBrandProfile,
  extractProducts,
  extractImageUrls,
  downloadBrandAssets,
  downloadFile,
} from "./firecrawl";
import { scrapeInstagramProfile } from "./apify";
import {
  analyzeBrandIdentity,
  extractProductsWithClaude,
} from "./claude";
import {
  writeBrand,
  writeProducts,
} from "./csv";

interface PipelineProgressLegacy {
  phase: string;
  step: string;
  message: string;
  progress: number;
  errors: string[];
  log: string[];
}

interface PipelineConfigLegacy {
  websiteUrl: string;
  instagramHandle: string;
  phases: string[];
}

type ProgressCallback = (progress: PipelineProgressLegacy) => void;

export async function runPipeline(
  config: PipelineConfigLegacy,
  onProgress: ProgressCallback
) {
  const errors: string[] = [];
  const log: string[] = [];

  function emit(
    phase: string,
    step: string,
    message: string,
    progress: number
  ) {
    log.push(`[${phase}] ${message}`);
    onProgress({ phase, step, message, progress, errors: [...errors], log: [...log] });
  }

  const phases = config.phases.length > 0 ? config.phases : ["brand"];

  if (phases.includes("brand")) {
    await runBrandPhase(config, emit, errors);
  }

  emit("done", "complete", "Pipeline complete!", 100);
}

async function runBrandPhase(
  config: PipelineConfigLegacy,
  emit: (phase: string, step: string, message: string, progress: number) => void,
  errors: string[]
) {
  emit("brand", "scraping", `Scraping website: ${config.websiteUrl}`, 5);

  try {
    const { pages } = await crawlWebsite(config.websiteUrl, 15);
    emit("brand", "extracting", `Crawled ${pages.length} pages`, 8);

    const metaBrand = extractBrandProfile(pages, config.websiteUrl);
    const metaProducts = extractProducts(pages);

    const allContent = pages
      .map((p) => p.markdown || p.data?.markdown || "")
      .join("\n\n");

    emit("brand", "analyzing", "Analyzing brand identity with AI...", 10);
    let analysis: Awaited<ReturnType<typeof analyzeBrandIdentity>> | null = null;
    try {
      analysis = await analyzeBrandIdentity(allContent, "", config.websiteUrl);
    } catch (e) {
      errors.push(`Brand analysis failed: ${e}`);
    }

    emit("brand", "products", "Extracting products with AI...", 14);
    let claudeProducts: Awaited<ReturnType<typeof extractProductsWithClaude>> = [];
    try {
      claudeProducts = await extractProductsWithClaude(allContent);
    } catch (e) {
      errors.push(`Product extraction failed: ${e}`);
    }

    const faviconUrl = await downloadFile(metaBrand.faviconUrl, "favicon.ico");
    if (faviconUrl) {
      metaBrand.faviconUrl = faviconUrl; // Use Supabase Storage URL
    }

    const webImageUrls = extractImageUrls(pages);
    await downloadBrandAssets(webImageUrls.slice(0, 15), "web");

    const brand = {
      ...metaBrand,
      name: analysis?.name || metaBrand.name,
      description: analysis?.description || metaBrand.description,
      tagline: analysis?.tagline || metaBrand.tagline,
      colors: analysis?.colors || metaBrand.colors,
      style: analysis?.style || metaBrand.style,
      instagramHandle: config.instagramHandle || metaBrand.instagramHandle,
      instagramFollowers: metaBrand.instagramFollowers,
      instagramProfilePicUrl: "",
    };

    const products = claudeProducts.length > 0 ? claudeProducts : metaProducts;

    if (config.instagramHandle) {
      emit("brand", "instagram", `Scraping Instagram: @${config.instagramHandle}`, 18);
      try {
        const igProfile = await scrapeInstagramProfile(config.instagramHandle);
        brand.instagramHandle = igProfile.username;
        brand.instagramFollowers = igProfile.followersCount.toString();
        if (!brand.description && igProfile.biography) {
          brand.description = igProfile.biography;
        }

        if (igProfile.profilePicUrl) {
          const ext = igProfile.profilePicUrl.match(/\.(png|jpg|jpeg|webp)/i)?.[1] || "jpg";
          const picUrl = await downloadFile(igProfile.profilePicUrl, `profile-pic.${ext}`);
          if (picUrl) {
            brand.instagramProfilePicUrl = picUrl; // Use Supabase Storage URL
          }
        }

        const igAssets = igProfile.posts
          .filter((p) => p.imageUrl)
          .map((p) => p.imageUrl);
        if (igAssets.length > 0) {
          await downloadBrandAssets(igAssets.slice(0, 12), "ig");
        }
      } catch (e) {
        errors.push(`Instagram scrape failed: ${e}`);
      }
    }

    await writeBrand(brand);
    await writeProducts(products);

    emit("brand", "done", `Brand profile saved: ${brand.name} (${products.length} products)`, 25);
  } catch (e) {
    errors.push(`Brand scraping failed: ${e}`);
    emit("brand", "error", `Brand scraping failed: ${e}`, 25);
  }
}
