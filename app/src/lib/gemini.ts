import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const BASE_URL = "https://generativelanguage.googleapis.com";
const MODEL = "gemini-2.5-flash";

async function uploadFile(filePath: string): Promise<string> {
  const fileSize = fs.statSync(filePath).size;
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mimeType = mimeMap[ext] || "application/octet-stream";
  const displayName = path.basename(filePath);

  const initRes = await fetch(
    `${BASE_URL}/upload/v1beta/files?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": fileSize.toString(),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: displayName } }),
    }
  );
  const uploadUrl = initRes.headers.get("X-Goog-Upload-URL");
  if (!uploadUrl) throw new Error("Failed to get upload URL");

  const fileData = fs.readFileSync(filePath);
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "X-Goog-Upload-Command": "upload, finalize",
      "X-Goog-Upload-Offset": "0",
      "Content-Type": mimeType,
    },
    body: fileData,
  });
  const result = await uploadRes.json();
  return result.file.uri;
}

async function waitForFile(fileUri: string): Promise<void> {
  const fileName = fileUri.split("/").pop();
  for (let i = 0; i < 30; i++) {
    const res = await fetch(
      `${BASE_URL}/v1beta/files/${fileName}?key=${GEMINI_API_KEY}`
    );
    const data = await res.json();
    if (data.state === "ACTIVE") return;
    if (data.state === "FAILED") throw new Error("File processing failed");
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("File processing timed out");
}

export async function uploadVideo(filePath: string): Promise<string> {
  const fileUri = await uploadFile(filePath);
  await waitForFile(fileUri);
  return fileUri;
}

async function geminiGenerate(
  contents: unknown[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(
        `${BASE_URL}/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              maxOutputTokens: options?.maxTokens ?? 8192,
              temperature: options?.temperature ?? 0.4,
            },
          }),
        }
      );
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (text) return text;
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 5000));
        continue;
      }
      throw new Error("Gemini returned no text: " + JSON.stringify(data).slice(0, 500));
    } catch (e) {
      if (attempt === maxRetries - 1) throw e;
      await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 3000));
    }
  }
  throw new Error("Gemini analysis failed after retries");
}

export async function analyzeVideo(
  fileUri: string,
  prompt: string
): Promise<string> {
  return geminiGenerate([
    {
      parts: [
        { file_data: { mime_type: "video/mp4", file_uri: fileUri } },
        { text: prompt },
      ],
    },
  ]);
}

export async function analyzeWithText(
  text: string,
  prompt: string
): Promise<string> {
  return geminiGenerate([
    {
      parts: [{ text: `${prompt}\n\nContent to analyze:\n${text}` }],
    },
  ]);
}

export async function analyzeImage(
  imagePath: string,
  prompt: string
): Promise<string> {
  const ext = path.extname(imagePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
  };
  const mimeType = mimeMap[ext] || "image/jpeg";
  const imageData = fs.readFileSync(imagePath);
  const base64 = imageData.toString("base64");

  return geminiGenerate([
    {
      parts: [
        { inline_data: { mime_type: mimeType, data: base64 } },
        { text: prompt },
      ],
    },
  ]);
}

export async function analyzeVideoContent(
  videoPath: string,
  prompt: string
): Promise<string> {
  const fileUri = await uploadFile(videoPath);
  await waitForFile(fileUri);

  const ext = path.extname(videoPath).toLowerCase();
  const mimeType = ext === ".webm" ? "video/webm" : ext === ".mov" ? "video/quicktime" : "video/mp4";

  return geminiGenerate([
    {
      parts: [
        { file_data: { mime_type: mimeType, file_uri: fileUri } },
        { text: prompt },
      ],
    },
  ]);
}

const BRAND_IMAGE_PROMPT = `Analyze this brand image and describe:
1. Color palette — dominant and accent colors (hex codes if possible)
2. Photography style — lifestyle, product, flat-lay, UGC, studio, etc.
3. Composition — layout, framing, use of space
4. Typography — any visible text, font style, placement
5. Overall aesthetic/mood — professional, playful, luxurious, minimal, etc.
6. Brand consistency signals — what visual elements suggest this is part of a brand system

Be specific and detailed. Focus on elements that define the brand's visual identity.`;

const BRAND_VIDEO_PROMPT = `Analyze this brand video and describe:
1. Visual style — production quality, color grading, lighting
2. Content type — talking head, product demo, lifestyle, UGC, testimonial, etc.
3. Pacing and transitions — fast/slow cuts, effects, text overlays
4. Products/services shown — what's being featured
5. Brand messaging — hooks, CTAs, key messages
6. Music/sound style — energetic, calm, trending audio, voiceover
7. Overall brand voice — professional, casual, aspirational, educational

Be specific about what visual and messaging patterns could inform ad creation.`;

export async function analyzeBrandVisuals(
  imagePaths: string[],
  videoPaths: string[],
  options?: { maxImages?: number; maxVideos?: number }
): Promise<string> {
  const maxImages = options?.maxImages ?? 6;
  const maxVideos = options?.maxVideos ?? 2;

  const analyses: string[] = [];

  const imagesSample = imagePaths.slice(0, maxImages);
  for (const imgPath of imagesSample) {
    try {
      const result = await analyzeImage(imgPath, BRAND_IMAGE_PROMPT);
      analyses.push(`[Image: ${path.basename(imgPath)}]\n${result}`);
    } catch (e) {
      analyses.push(`[Image: ${path.basename(imgPath)}] Analysis failed: ${e}`);
    }
  }

  const videosSample = videoPaths.slice(0, maxVideos);
  for (const vidPath of videosSample) {
    try {
      const result = await analyzeVideoContent(vidPath, BRAND_VIDEO_PROMPT);
      analyses.push(`[Video: ${path.basename(vidPath)}]\n${result}`);
    } catch (e) {
      analyses.push(`[Video: ${path.basename(vidPath)}] Analysis failed: ${e}`);
    }
  }

  if (analyses.length === 0) {
    return "No visual assets available for analysis.";
  }

  const synthesis = await analyzeWithText(
    analyses.join("\n\n---\n\n"),
    `You are a brand identity analyst. Based on the individual analyses of brand images and videos below, synthesize a unified visual brand identity profile. Cover:

1. **Color Palette**: Primary and accent colors used consistently
2. **Photography Style**: Dominant style across images
3. **Visual Consistency**: How consistent is the brand's visual language?
4. **Typography**: Common text/font patterns
5. **Overall Aesthetic**: The brand's visual personality in 2-3 sentences
6. **Video Style** (if applicable): Production approach and content types
7. **Recommendations for Ad Creation**: What visual elements should ads replicate to feel on-brand?

Be concise but specific. This will be used to guide AI ad generation.`
  );

  return synthesis;
}

const AD_ANALYSIS_PROMPT = `You are an expert ad strategist. Analyze this YouTube video about advertising and extract:

## Key Ad Tactics
List every specific ad tactic, strategy, or technique mentioned.

## Frameworks & Formulas
Any specific copywriting frameworks (AIDA, PAS, hook formulas, etc.)

## Examples & Case Studies
Specific examples or case studies referenced in the video.

## Do's and Don'ts
Actionable rules for creating effective ads.

## Metrics & Benchmarks
Any specific numbers, benchmarks, or performance metrics mentioned.

## Summary
A 2-3 paragraph summary of the most important takeaways for someone creating ads.

Be thorough and specific. Extract actual tactics, not vague advice.`;

export { AD_ANALYSIS_PROMPT };
