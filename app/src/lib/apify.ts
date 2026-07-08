import fs from "fs";
import path from "path";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const DATA_DIR = path.join(process.cwd(), "..", "data");

interface ApifyRunResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[];
}

async function runActor(
  actorId: string,
  input: Record<string, unknown>,
  timeoutMs: number = 240_000,
): Promise<ApifyRunResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${APIFY_API_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    if (!res.ok) {
      throw new Error(`Apify actor ${actorId} failed: ${res.status}`);
    }
    const items = await res.json();
    return { items: Array.isArray(items) ? items : [] };
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      throw new Error(`Apify actor ${actorId} timed out after ${timeoutMs / 1000}s`);
    }
    throw e;
  }
}

export interface InstagramPost {
  url: string;
  imageUrl: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  timestamp: string;
}

export interface InstagramProfile {
  username: string;
  fullName: string;
  biography: string;
  followersCount: number;
  profilePicUrl: string;
  posts: InstagramPost[];
}

export async function scrapeInstagramProfile(
  username: string
): Promise<InstagramProfile> {
  const { items } = await runActor("apify~instagram-profile-scraper", {
    usernames: [username],
    resultsLimit: 12,
  });

  if (items.length === 0) {
    return {
      username,
      fullName: "",
      biography: "",
      followersCount: 0,
      profilePicUrl: "",
      posts: [],
    };
  }

  const profile = items[0];
  const posts: InstagramPost[] = (profile.latestPosts || [])
    .slice(0, 12)
    .map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => ({
        url: p.url || "",
        imageUrl: p.displayUrl || p.imageUrl || "",
        caption: (p.caption || "").slice(0, 500),
        likesCount: p.likesCount || 0,
        commentsCount: p.commentsCount || 0,
        timestamp: p.timestamp || "",
      })
    );

  return {
    username: profile.username || username,
    fullName: profile.fullName || "",
    biography: profile.biography || "",
    followersCount: profile.followersCount || 0,
    profilePicUrl: profile.profilePicUrl || "",
    posts,
  };
}

export interface MetaAd {
  id: string;
  advertiserName: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaText: string;
  imageUrl: string;
  videoUrl: string;
  linkUrl: string;
  platforms: string;
  startDate: string;
  isActive: boolean;
}

export async function scrapeMetaAds(
  query: string,
  options: { country?: string; limit?: number } = {}
): Promise<MetaAd[]> {
  const country = options.country || "US";
  const limit = options.limit || 10;
  // Over-request because many ads are video-only or DCO templates.
  // Scale multiplier down for small limits to avoid huge scrapes.
  const multiplier = limit <= 5 ? 4 : limit <= 10 ? 6 : 8;
  const requestLimit = limit * multiplier;
  const adLibraryUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${encodeURIComponent(query)}&search_type=keyword_unordered&media_type=all`;

  const { items } = await runActor("curious_coder~facebook-ads-library-scraper", {
    urls: [{ url: adLibraryUrl }],
    count: requestLimit,
  });

  let results: MetaAd[];
  if (items.length === 1 && items[0].results) {
    results = (items[0].results || []).map(mapAdResult(query));
  } else {
    results = items
      .filter((ad: Record<string, unknown>) => !ad.error && ad.snapshot)
      .map(mapAdResult(query));
  }

  // Only keep ads that have an image AND are not DCO templates
  const usable = results.filter((ad) => hasImage(ad) && !isDcoAd(ad) && (ad.primaryText || ad.headline));

  // Filter to ads from the advertiser (page name contains query terms)
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);
  const relevant = usable.filter((ad) => {
    const pageLower = ad.advertiserName.toLowerCase();
    return queryWords.every((w) => pageLower.includes(w)) || pageLower.includes(queryLower);
  });

  const pool = relevant.length > 0 ? relevant : usable;

  // Deduplicate: Meta runs the same creative with different ad IDs for A/B testing.
  // Keep only one ad per unique primaryText (first 100 chars).
  const seen = new Set<string>();
  const unique = pool.filter((ad) => {
    const key = ad.primaryText.slice(0, 100).trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, limit);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAdResult(query: string): (ad: any) => MetaAd {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ad: any) => {
    const s = ad.snapshot || {};
    const card = s.cards?.[0] || {};
    const pageName = s.page_name || ad.page_name || query;
    const video = s.videos?.[0];

    const primaryText = card.body || s.body?.text || "";
    const imageUrl =
      card.original_image_url ||
      card.resized_image_url ||
      video?.video_preview_image_url ||
      "";

    return {
      id:
        ad.ad_archive_id ||
        ad.adArchiveID ||
        `ad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      advertiserName: pageName,
      headline: card.title || s.title || "",
      primaryText,
      description: card.link_description || s.link_description || "",
      ctaText: card.cta_text || s.cta_text || "",
      imageUrl,
      videoUrl: video?.video_hd_url || video?.video_sd_url || "",
      linkUrl: card.link_url || s.link_url || "",
      platforms: (ad.publisher_platform || ad.publisherPlatform || ["facebook", "instagram"]).join(","),
      startDate: ad.start_date_formatted || ad.startDateFormatted || "",
      isActive: ad.is_active !== false && ad.isActive !== false,
    };
  };
}

function isDcoAd(ad: MetaAd): boolean {
  const all = `${ad.primaryText} ${ad.headline} ${ad.description} ${ad.ctaText}`;
  return all.includes("{{");
}

function hasImage(ad: MetaAd): boolean {
  return !!ad.imageUrl;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function downloadAdImage(
  imageUrl: string,
  advertiser: string,
  adId: string
): Promise<string> {
  if (!imageUrl) return "";

  const dir = path.join(DATA_DIR, "competitor-ads", slugify(advertiser));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  try {
    const res = await fetch(imageUrl);
    if (!res.ok) return "";
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
    const filename = `${adId}${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);
    return `competitor-ads/${slugify(advertiser)}/${filename}`;
  } catch {
    return "";
  }
}

export interface YouTubeVideo {
  title: string;
  description: string;
  channelName: string;
  channelUrl: string;
  thumbnailUrl: string;
  videoUrl: string;
  viewCount: number;
  subscriberCount?: number;
  transcript?: string;
}

export interface YouTubeChannelData {
  channelName: string;
  channelUrl: string;
  description: string;
  subscriberCount: number;
  videos: YouTubeVideo[];
}

export async function scrapeYouTubeChannel(
  channelUrl: string,
  maxVideos: number = 3
): Promise<YouTubeChannelData> {
  // Use streamers~youtube-scraper with correct input format
  const { items: videoItems } = await runActor("streamers~youtube-scraper", {
    startUrls: [{ url: channelUrl }],  // Must be object with 'url' property
    maxResults: maxVideos,
    downloadSubtitles: true,  // Enable subtitle download
  });

  if (videoItems.length === 0) {
    return {
      channelName: "",
      channelUrl,
      description: "",
      subscriberCount: 0,
      videos: [],
    };
  }

  // Extract channel info from first video
  const firstVideo = videoItems[0];
  const channelName = firstVideo.channelName || "";
  const channelDescription = firstVideo.text || "";  // Channel description in 'text' field

  // Map videos with subtitles
  const videos: YouTubeVideo[] = videoItems.map((v: any) => {
    // Subtitles are in array format: v.subtitles[0].srt
    const subtitleText = (v.subtitles && Array.isArray(v.subtitles) && v.subtitles[0])
      ? v.subtitles[0].srt
      : "";

    return {
      title: v.title || "",
      description: (v.text || "").slice(0, 500),
      channelName: v.channelName || channelName,
      channelUrl: v.channelUrl || channelUrl,
      thumbnailUrl: v.thumbnailUrl || "",
      videoUrl: v.url || "",
      viewCount: v.viewCount || v.numberOfViews || 0,
      transcript: subtitleText,
    };
  });

  return {
    channelName,
    channelUrl,
    description: channelDescription,
    subscriberCount: 0,  // This actor doesn't return subscriber count
    videos: videos.filter((v) => v.transcript), // Only keep videos with transcripts
  };
}
