import { Brand, Product } from "./types";
import { saveAsset } from "./storage";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || "";
const BASE_URL = "https://api.firecrawl.dev";

interface ScrapeResult {
  success?: boolean;
  markdown?: string;
  metadata?: Record<string, string>;
  links?: string[];
  data?: {
    markdown?: string;
    metadata?: Record<string, string>;
    links?: string[];
  };
}

function getMarkdown(page: ScrapeResult): string {
  return page.markdown || page.data?.markdown || "";
}

function getMetadata(page: ScrapeResult): Record<string, string> {
  return page.metadata || page.data?.metadata || {};
}

export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  const res = await fetch(`${BASE_URL}/v1/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });
  return res.json();
}

export async function crawlWebsite(
  url: string,
  maxPages = 10
): Promise<{ pages: ScrapeResult[] }> {
  const startRes = await fetch(`${BASE_URL}/v1/crawl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
    },
    body: JSON.stringify({
      url,
      limit: maxPages,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  const { id } = await startRes.json();

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${BASE_URL}/v1/crawl/${id}`, {
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
    });
    const status = await statusRes.json();
    if (status.status === "completed") {
      return { pages: status.data || [] };
    }
    if (status.status === "failed") {
      throw new Error("Crawl failed: " + (status.error || "unknown"));
    }
  }
  throw new Error("Crawl timed out");
}

export function extractBrandProfile(
  pages: ScrapeResult[],
  url: string
): Brand {
  const allContent = pages
    .map((p) => getMarkdown(p))
    .join("\n\n")
    .slice(0, 5000);

  const metadata = getMetadata(pages[0] || {});

  const hostname = new URL(url).origin;
  const faviconUrl = `${hostname}/favicon.ico`;

  return {
    name: metadata.title?.split("|")[0]?.trim() || new URL(url).hostname,
    url,
    description: metadata.description || allContent.slice(0, 300),
    tagline: metadata.ogTitle || "",
    products: "",
    colors: "",
    logoUrl: metadata.ogImage || "",
    faviconUrl,
    style: "",
    instagramHandle: "",
    instagramFollowers: "",
    instagramProfilePicUrl: "",
  };
}

export function extractProductImageMap(pages: ScrapeResult[]): Record<string, string> {
  const map: Record<string, string> = {};

  for (const page of pages) {
    const metadata = getMetadata(page);
    const url = metadata.sourceURL || "";
    const isProductPage = /\/(product|shop|collection|item|buy|store|p\/)/i.test(url);
    if (isProductPage && metadata.ogImage) {
      const title = metadata.title?.split("|")[0]?.split("–")[0]?.split("-")[0]?.trim().toLowerCase() || "";
      if (title) map[title] = metadata.ogImage;
    }

    const content = getMarkdown(page);
    const imgMatches = content.matchAll(/!\[([^\]]+)\]\((https?:\/\/[^\s)]+\.(?:png|jpg|jpeg|webp)[^\s)]*)\)/gi);
    for (const m of imgMatches) {
      const alt = m[1].trim().toLowerCase();
      const imgUrl = m[2];
      if (alt.length < 3 || alt.length > 80) continue;
      if (/^(icon|logo|banner|hero|it'?s|shop|view|image|img|photo)/i.test(alt)) continue;
      if (!map[alt]) map[alt] = imgUrl;
    }
  }

  return map;
}

export function extractImageUrls(pages: ScrapeResult[]): string[] {
  const productImages: string[] = [];
  const otherImages: string[] = [];
  const seen = new Set<string>();

  function addUrl(imgUrl: string, isProduct: boolean) {
    if (seen.has(imgUrl)) return;
    if (/\.(svg|gif|ico)/i.test(imgUrl)) return;
    if (/userway|widget|icon|logo.*small|badge|pixel|tracker/i.test(imgUrl)) return;
    seen.add(imgUrl);
    if (isProduct) {
      productImages.push(imgUrl);
    } else {
      otherImages.push(imgUrl);
    }
  }

  for (const page of pages) {
    const metadata = getMetadata(page);
    const url = metadata.sourceURL || "";
    const isProductPage = /\/(product|shop|collection|item|buy|store|p\/)/i.test(url);

    if (metadata.ogImage) addUrl(metadata.ogImage, isProductPage);

    const content = getMarkdown(page);
    const imgMatches = content.matchAll(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/g);
    for (const m of imgMatches) {
      const imgUrl = m[1];
      if (/\.(png|jpg|jpeg|webp)(\?|$)/i.test(imgUrl)) {
        addUrl(imgUrl, isProductPage);
      }
    }
  }

  return [...productImages, ...otherImages];
}

export function extractProducts(pages: ScrapeResult[]): Product[] {
  const products: Product[] = [];
  const seenNames = new Set<string>();

  for (const page of pages) {
    const content = getMarkdown(page);
    const metadata = getMetadata(page);
    const url = metadata.sourceURL || "";

    const isProductUrl =
      /\/(product|shop|collection|item|buy|store|p\/)/i.test(url);
    const hasPrice = /\$[\d,.]+/.test(content);
    const hasAddToCart = /add.to.cart|buy.now|add.to.bag/i.test(content);
    const ogType = (metadata.ogType || "").toLowerCase();
    const isProductMeta = ogType === "product" || ogType === "og:product";

    if (isProductUrl || isProductMeta || (hasPrice && hasAddToCart)) {
      const title = metadata.title?.split("|")[0]?.split("–")[0]?.split("-")[0]?.trim() || "Product";
      if (seenNames.has(title.toLowerCase())) continue;
      seenNames.add(title.toLowerCase());

      const desc = metadata.description || "";
      const image = metadata.ogImage || "";
      const priceMatch = content.match(/\$[\d,.]+/);

      products.push({
        id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: title,
        description: desc.slice(0, 200),
        price: priceMatch ? priceMatch[0] : "",
        imageUrl: image,
        category: "",
      });
    }
  }

  if (products.length === 0) {
    for (const page of pages) {
      const content = getMarkdown(page);
      const priceMatches = [...content.matchAll(/#+\s*(.+?)\n[\s\S]*?\$[\d,.]+/g)];
      for (const match of priceMatches) {
        const name = match[1].replace(/[*_#\[\]]/g, "").trim();
        if (!name || name.length > 80 || seenNames.has(name.toLowerCase())) continue;
        seenNames.add(name.toLowerCase());
        const priceMatch = match[0].match(/\$[\d,.]+/);
        products.push({
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          description: "",
          price: priceMatch ? priceMatch[0] : "",
          imageUrl: "",
          category: "",
        });
      }
    }
  }

  return products;
}

export async function downloadBrandAssets(
  urls: string[],
  prefix = "brand"
): Promise<string[]> {
  const saved: string[] = [];
  for (const url of urls.slice(0, 20)) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) continue;
      const ext = url.match(/\.(png|jpg|jpeg|webp|svg)/i)?.[1] || "jpg";
      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const contentType = `image/${ext === "jpg" ? "jpeg" : ext}`;

      const publicUrl = await saveAsset(buffer, "brand-assets", filename, contentType);
      if (publicUrl) {
        saved.push(publicUrl);
      }
    } catch {
      continue;
    }
  }
  return saved;
}

export async function downloadFile(
  url: string,
  filename: string
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null;

    const ext = filename.match(/\.(png|jpg|jpeg|webp|svg|ico)/i)?.[1] || "jpg";
    const contentType = ext === "ico" ? "image/x-icon" : `image/${ext === "jpg" ? "jpeg" : ext}`;

    return await saveAsset(buffer, "brand-assets", filename, contentType);
  } catch {
    return null;
  }
}
