import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const KNOWLEDGE_DIR = path.join(DATA_DIR, "knowledge");
const ASSETS_DIR = path.join(DATA_DIR, "brand-assets");

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const YOUTUBE_URLS = [
  "https://www.youtube.com/watch?v=fSbqaTlWaYI",
  "https://www.youtube.com/watch?v=zCqcPGNsOFc",
  "https://www.youtube.com/watch?v=JDR-R--4HhM",
  "https://www.youtube.com/watch?v=dAJyqo6wnq4",
  "https://www.youtube.com/watch?v=VF2uMUqlaDg",
  "https://www.youtube.com/watch?v=rWhmrxOFtaA",
  "https://www.youtube.com/watch?v=f7j3JSBD6so",
  "https://www.youtube.com/watch?v=iPw8vMoWiK0",
  "https://www.youtube.com/watch?v=mZWJCjhZanQ",
  "https://www.youtube.com/watch?v=ZpLSWXAPoLo",
];

function extractVideoId(url) {
  const m = url.match(/[?&]v=([a-zA-Z0-9_-]+)/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

for (const dir of [DATA_DIR, KNOWLEDGE_DIR, ASSETS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function getVideoMetadata(urls) {
  console.log(`\n📹 Getting video metadata via Apify...\n`);
  const res = await fetch(
    `https://api.apify.com/v2/acts/streamers~youtube-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: urls.map((url) => ({ url })),
        maxResults: urls.length,
      }),
    }
  );
  if (!res.ok) throw new Error(`Metadata scraper failed: ${res.status}`);
  return res.json();
}

async function getTranscript(videoUrl) {
  const res = await fetch(
    `https://api.apify.com/v2/acts/supreme_coder~youtube-transcript-scraper/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=60`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: [{ url: videoUrl }],
        outputFormat: "text",
      }),
    }
  );
  if (!res.ok) return "";
  const data = await res.json();
  if (!data || !data[0]) return "";
  return data[0].transcript || "";
}

async function downloadThumbnail(videoId, thumbnailUrl) {
  const filename = `${videoId}.jpg`;
  const filepath = path.join(ASSETS_DIR, filename);
  if (fs.existsSync(filepath)) return filename;
  try {
    const res = await fetch(thumbnailUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    fs.writeFileSync(filepath, Buffer.from(await res.arrayBuffer()));
    return filename;
  } catch {
    return null;
  }
}

async function analyzeWithClaude(title, channelName, transcript) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: `You are an expert ad strategist. Analyze this YouTube video transcript and extract actionable advertising knowledge.

Video: "${title}" by ${channelName}

Transcript:
${transcript.slice(0, 15000)}

Write a comprehensive markdown document:

# ${title}
**By ${channelName}**

## Key Ad Tactics
List every specific ad tactic, strategy, or technique mentioned. Be specific and actionable.

## Frameworks & Formulas
Any copywriting frameworks (AIDA, PAS, hook formulas, etc.) or step-by-step processes.

## Examples & Case Studies
Specific examples, case studies, or real brands/campaigns referenced.

## Do's and Don'ts
Clear actionable rules for creating effective ads.

## Metrics & Benchmarks
Any specific numbers, benchmarks, conversion rates, or performance metrics mentioned.

## Key Quotes
3-5 of the most impactful quotes or statements.

## Summary
A 2-3 paragraph summary of the most important takeaways for someone creating ads.

Be thorough and specific. Extract actual tactics, not vague advice.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

function buildCsv(records, columns) {
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? '"' + s.replace(/"/g, '""') + '"'
      : s;
  };
  return [columns.join(","), ...records.map((r) => columns.map((c) => esc(r[c])).join(","))].join("\n") + "\n";
}

async function main() {
  console.log("=== YouTube Knowledge Base Builder ===\n");

  // Step 1: Metadata
  let metaItems;
  try {
    metaItems = await getVideoMetadata(YOUTUBE_URLS);
    console.log(`✅ Metadata: ${metaItems.length} videos\n`);
  } catch (e) {
    console.error("Metadata failed:", e.message);
    metaItems = YOUTUBE_URLS.map((url) => ({
      url,
      title: "",
      channelName: "",
      thumbnailUrl: `https://i.ytimg.com/vi/${extractVideoId(url)}/hqdefault.jpg`,
      description: "",
    }));
  }

  const metaMap = {};
  for (const m of metaItems) {
    const id = m.id || extractVideoId(m.url || "");
    if (id) metaMap[id] = m;
  }

  const sources = [];
  const knowledge = [];

  // Step 2: Process each video
  for (let i = 0; i < YOUTUBE_URLS.length; i++) {
    const url = YOUTUBE_URLS[i];
    const videoId = extractVideoId(url);
    const meta = metaMap[videoId] || {};
    const title = meta.title || `Video ${i + 1}`;
    const channelName = meta.channelName || meta.channelTitle || meta.author || "Unknown";
    const thumbnailUrl = meta.thumbnailUrl || meta.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[${i + 1}/10] ${title} — ${channelName}`);

    // Download thumbnail
    const thumbFile = await downloadThumbnail(videoId, thumbnailUrl);
    console.log(`  📷 Thumbnail: ${thumbFile || "failed"}`);

    // Get transcript
    console.log(`  📝 Fetching transcript...`);
    let transcript = "";
    try {
      transcript = await getTranscript(url);
      console.log(`  📝 Transcript: ${transcript.length} chars`);
    } catch (e) {
      console.log(`  ⚠️ Transcript failed: ${e.message}`);
    }

    // Analyze
    let analysis = "";
    const textToAnalyze = transcript || meta.description || "";
    if (textToAnalyze.length > 50) {
      console.log(`  🤖 Analyzing with Claude...`);
      try {
        analysis = await analyzeWithClaude(title, channelName, textToAnalyze);
        console.log(`  ✅ Analysis: ${analysis.length} chars`);
      } catch (e) {
        console.log(`  ✗ Claude failed: ${e.message}`);
        analysis = `# ${title}\n**By ${channelName}**\n\n## Summary\n${textToAnalyze.slice(0, 500)}`;
      }
    } else {
      analysis = `# ${title}\n**By ${channelName}**\n\n## Summary\nInsufficient content for analysis.`;
    }

    fs.writeFileSync(path.join(KNOWLEDGE_DIR, `${videoId}.md`), analysis);
    console.log(`  💾 Saved: data/knowledge/${videoId}.md\n`);

    sources.push({
      id: videoId, type: "youtube", title, url, thumbnailUrl,
      thumbnailFile: thumbFile || "", channelName,
      dateScraped: new Date().toISOString(),
      description: (meta.description || "").slice(0, 300),
    });

    const tacticsMatch = analysis.match(/## Key Ad Tactics[\s\S]*?(?=\n## |$)/);
    knowledge.push({
      id: videoId, source: "youtube", videoTitle: title, channelName,
      thumbnailUrl, videoUrl: url,
      dateAnalyzed: new Date().toISOString(),
      tactics: (tacticsMatch?.[0] || "").slice(0, 1000),
      fullTranscript: "", summary: analysis.slice(0, 500),
    });

    if (i < YOUTUBE_URLS.length - 1) await new Promise((r) => setTimeout(r, 1000));
  }

  // Write CSVs
  console.log("📊 Writing CSV files...");
  fs.writeFileSync(path.join(DATA_DIR, "sources.csv"), buildCsv(sources, [
    "id", "type", "title", "url", "thumbnailUrl", "thumbnailFile", "channelName", "dateScraped", "description",
  ]));
  fs.writeFileSync(path.join(DATA_DIR, "knowledge.csv"), buildCsv(knowledge, [
    "id", "source", "videoTitle", "channelName", "thumbnailUrl", "videoUrl", "dateAnalyzed", "tactics", "fullTranscript", "summary",
  ]));

  console.log(`\n🎉 Done! ${fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith('.md')).length} knowledge files, ${fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.jpg')).length} thumbnails`);
}

main().catch((e) => { console.error("❌", e); process.exit(1); });
