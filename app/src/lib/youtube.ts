import fs from "fs";
import path from "path";

const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN || "";
const DATA_DIR = path.join(process.cwd(), "..", "data");

export function extractVideoId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getVideoThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export interface YouTubeMetadata {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  url: string;
  description: string;
  duration: string;
}

export async function getVideoMetadata(
  url: string
): Promise<YouTubeMetadata | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  try {
    const res = await fetch(
      "https://api.apify.com/v2/acts/bernardo~youtube-scraper/run-sync-get-dataset-items",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APIFY_API_TOKEN}`,
        },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxResults: 1,
          downloadSubtitles: false,
        }),
      }
    );
    const data = await res.json();
    if (data && data.length > 0) {
      const v = data[0];
      return {
        videoId,
        title: v.title || "",
        channelName: v.channelName || v.channelTitle || "",
        thumbnailUrl: v.thumbnailUrl || getVideoThumbnail(videoId),
        url,
        description: (v.description || "").slice(0, 500),
        duration: v.duration || "",
      };
    }
  } catch {
    // fallback
  }

  return {
    videoId,
    title: "",
    channelName: "",
    thumbnailUrl: getVideoThumbnail(videoId),
    url,
    description: "",
    duration: "",
  };
}

export async function downloadVideo(url: string): Promise<string | null> {
  const videoId = extractVideoId(url);
  if (!videoId) return null;

  const tmpDir = path.join(DATA_DIR, "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const outputPath = path.join(tmpDir, `${videoId}.mp4`);

  if (fs.existsSync(outputPath)) return outputPath;

  try {
    const res = await fetch(
      "https://api.apify.com/v2/acts/bernardo~youtube-scraper/run-sync-get-dataset-items",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${APIFY_API_TOKEN}`,
        },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxResults: 1,
          downloadSubtitles: true,
        }),
      }
    );
    const data = await res.json();
    if (data?.[0]?.subtitles) {
      fs.writeFileSync(
        path.join(tmpDir, `${videoId}.txt`),
        data[0].subtitles
      );
    }

    if (data?.[0]?.videoUrl) {
      const videoRes = await fetch(data[0].videoUrl);
      if (videoRes.ok) {
        const buffer = Buffer.from(await videoRes.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        return outputPath;
      }
    }
  } catch {
    // fall through
  }

  return null;
}
