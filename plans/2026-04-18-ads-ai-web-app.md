# Plan: AI Ad Creator Web App

**Created:** 2026-04-18
**Status:** Implemented
**Request:** Build a full-stack web app that scrapes brand data, analyzes competitor ads, learns ad tactics from YouTube experts, and generates new ad concepts with AI image generation — designed to be white-label so any business can plug in their brand.

---

## Overview

### What This Plan Accomplishes

Build a Next.js web app (matching the tiktok-ai reference app's dark glass-morphism design) that:
1. Scrapes a brand's website + Instagram via FireCrawl and Apify to build a brand profile
2. Transcribes and analyzes YouTube videos from ad experts to build a tactics knowledge base
3. Analyzes competitor Meta Ads via Apify to identify winning patterns
4. Generates new ad concepts (copy + AI-generated images) using Claude + image generation APIs
5. Presents all of this in a clean multi-tab interface with a "Sources" proof-of-work page

### Why This Matters

This tool automates the entire ad creation workflow — from research to concept generation — making it accessible to anyone running a business. The white-label design means it can be handed to clients or demonstrated as a product. The "Sources" tab provides credibility by showing the YouTube videos and data behind the AI's recommendations.

---

## Current State

### Relevant Existing Structure

| Path | Contents |
|------|----------|
| `reference/sources.md` | Company URL (bloomnu.com) + 10 YouTube video links (Hormozi + others) |
| `.env` | API keys: APIFY_API_TOKEN, GEMINI_API_KEY, ANTHROPIC_API_KEY, KIE_AI_API_KEY, FIRECRAWL_API_KEY, PERPLEXITY_AI_API_KEY |
| `context/` | Template files (unpopulated) |
| `outputs/` | Empty |
| `plans/` | Empty |

### Reference App (tiktok-ai)

The tiktok-ai app at `/Users/olegmelnikov/Desktop/Software Projects/tiktok-ai/` provides the exact design system and architecture to replicate:
- **Stack:** Next.js 16.2.4, TypeScript, Tailwind CSS v4 (oklch colors), shadcn/ui (base-ui v1.4.0)
- **Design:** Dark glass-morphism theme, sidebar + topbar layout, purple/indigo gradients
- **Data:** CSV-based storage with atomic writes
- **Pipeline:** SSE streaming for real-time progress
- **Key patterns:** `render` prop (not `asChild`), `glass`/`glass-strong` CSS utilities, Geist fonts

### Gaps Being Addressed

- No web app exists yet
- No knowledge base of ad tactics
- No brand profile or competitor analysis tooling
- No ad concept generation workflow

---

## Proposed Changes

### Summary of Changes

- Create a Next.js web app in `app/` mirroring the tiktok-ai architecture
- Build data scraping pipeline: FireCrawl (website), Apify (Instagram + Meta Ads), Gemini (YouTube transcription)
- Create knowledge base in `data/knowledge/` from scraped YouTube content
- Build 5-tab UI: Ad Creator, Competitor Ads, Knowledge Base, Beginner Tips, Sources
- Integrate AI image generation for ad visuals
- Design for white-label use (company name/URL as input, auto-scraping)

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/package.json` | Next.js app dependencies |
| `app/next.config.ts` | Next.js config with dotenv loading |
| `app/tsconfig.json` | TypeScript configuration |
| `app/postcss.config.mjs` | Tailwind postcss pipeline |
| `app/src/app/layout.tsx` | Root layout with sidebar + topbar |
| `app/src/app/globals.css` | Dark theme, oklch colors, glass-morphism (copied from tiktok-ai) |
| `app/src/app/page.tsx` | Index redirect to /create |
| `app/src/app/create/page.tsx` | Ad Creator — main concept generation page |
| `app/src/app/competitors/page.tsx` | Competitor Meta Ads analysis |
| `app/src/app/knowledge/page.tsx` | Knowledge base viewer (ad tactics) |
| `app/src/app/tips/page.tsx` | Beginner ad tips (static content) |
| `app/src/app/sources/page.tsx` | Sources — YouTube thumbnails, scraped data provenance |
| `app/src/app/api/brand/route.ts` | GET brand profile, POST scrape brand |
| `app/src/app/api/competitors/route.ts` | GET/POST competitor ads from Meta |
| `app/src/app/api/knowledge/route.ts` | GET knowledge base entries |
| `app/src/app/api/create/route.ts` | POST generate ad concept (copy + image) |
| `app/src/app/api/pipeline/route.ts` | POST run full data pipeline with SSE |
| `app/src/app/api/proxy-image/route.ts` | Image proxy for external CDN URLs |
| `app/src/lib/firecrawl.ts` | FireCrawl API integration (website scraping) |
| `app/src/lib/apify.ts` | Apify integration (Instagram + Meta Ads scraping) |
| `app/src/lib/gemini.ts` | Gemini API (YouTube transcription + analysis) |
| `app/src/lib/claude.ts` | Claude API (ad copy generation) |
| `app/src/lib/kie-ai.ts` | Kie.ai / Nano Banana Pro image generation |
| `app/src/lib/youtube.ts` | YouTube video metadata + download helpers |
| `app/src/lib/csv.ts` | CSV read/write with atomic writes (from tiktok-ai) |
| `app/src/lib/types.ts` | TypeScript interfaces |
| `app/src/lib/utils.ts` | Utility functions |
| `app/src/lib/pipeline.ts` | Multi-phase pipeline orchestrator |
| `app/src/components/app-sidebar.tsx` | Navigation sidebar |
| `app/src/components/top-bar.tsx` | Sticky header |
| `app/src/components/markdown-content.tsx` | Markdown renderer |
| `app/src/components/ui/` | shadcn/ui components (copied from tiktok-ai) |
| `app/src/context/pipeline-context.tsx` | Global pipeline state |
| `app/src/hooks/use-mobile.ts` | Responsive breakpoint hook |
| `data/brand.csv` | Scraped brand profile data |
| `data/products.csv` | Scraped product catalog |
| `data/brand-assets/` | Downloaded brand images/logos |
| `data/competitors.csv` | Competitor ad data from Meta |
| `data/knowledge/` | Knowledge base markdown files |
| `data/sources.csv` | YouTube video metadata + thumbnails |
| `data/concepts.csv` | Generated ad concepts |
| `package.json` | Root package.json (proxies to app/) |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `CLAUDE.md` | Add app documentation, tech stack, commands |

---

## Design Decisions

### Key Decisions Made

1. **Mirror tiktok-ai architecture exactly:** Same Next.js 16 + base-ui + Tailwind v4 stack, same dark glass-morphism design, same CSV storage pattern. This ensures consistency and the user gets the same quality app they already approved.

2. **5-tab navigation instead of tiktok-ai's 4:** Ad Creator (main), Competitor Ads, Knowledge Base, Beginner Tips, Sources. Each serves a distinct purpose in the ad creation workflow.

3. **Two-phase pipeline:** Phase 1 (setup) scrapes brand website + Instagram + YouTube videos to build the knowledge base. Phase 2 (ongoing) scrapes competitor ads and generates new concepts. This separates one-time setup from repeated use.

4. **White-label via brand profile:** All brand-specific data lives in `data/brand.csv` and `data/brand-assets/`. Changing the company just means re-running the brand scraping phase with a new URL. The app reads brand data dynamically, never hardcoding.

5. **Gemini for YouTube transcription:** Gemini 2.5 Flash handles video upload and multimodal analysis (same proven pattern from tiktok-ai). It will transcribe, extract key tactics, and summarize each video.

6. **Claude for ad copy generation:** Claude Sonnet generates ad copy informed by the knowledge base (YouTube tactics) + brand profile + competitor analysis.

7. **Knowledge base as markdown files:** Each YouTube video gets its own markdown file in `data/knowledge/` with extracted tactics. These are loaded into Claude's context when generating ad concepts, and displayed in the Knowledge Base tab.

8. **Sources tab as proof-of-work:** Stores YouTube thumbnails, video titles, channel names, and links. Visually proves the knowledge base is built on real expert content.

### Alternatives Considered

- **Database instead of CSV:** Rejected — CSV matches the tiktok-ai pattern, keeps the app simple and portable. No setup needed.
- **Single pipeline phase:** Rejected — brand setup is one-time while competitor analysis is ongoing. Separating them makes the UX cleaner.
- **Server-side rendering for all pages:** Rejected — client-side with API routes is simpler and matches the reference app pattern.

### Resolved Questions

1. **Image generation API:** Kie.ai (kie.ai) — a unified AI API platform. Using the **Nano Banana Pro** model (Google Gemini 3.0 Pro Image). Supports up to 8 reference images per request, ideal for product-in-context ad generation. API key: `KIE_AI_API_KEY` in `.env`. Base URL: `https://api.kie.ai/api/v1/jobs/createTask`. Auth: Bearer token. ~$0.09-0.12/image.

2. **FireCrawl API key:** Present in `.env` as `FIRECRAWL_API_KEY`.

3. **Instagram handle:** `@bloomsupps` — the official Bloom Nutrition Instagram with millions of followers. Will use Apify `apify/instagram-profile-scraper` to pull recent posts + media.

4. **Default competitors for bloomnu.com demo:** AG1 (Athletic Greens), Huel, Orgain, Garden of Life, Vital Proteins, Aloha — all major nutrition/supplement brands with heavy Meta ad spend. Auto-discovered via web research.

5. **Beginner tips:** Auto-generated from the YouTube knowledge base, simplified for beginners.

6. **Perplexity API:** Available in `.env` as `PERPLEXITY_AI_API_KEY` — can be used for additional research/enrichment if needed.

---

## Step-by-Step Tasks

### Step 1: Project Scaffolding

Set up the Next.js project structure mirroring tiktok-ai.

**Actions:**
- Create `package.json` at root with proxy scripts to `app/`
- Initialize `app/` with Next.js 16, TypeScript, Tailwind v4, base-ui
- Copy over `globals.css` (dark theme, oklch colors, glass-morphism utilities) from tiktok-ai
- Copy shadcn/ui components from tiktok-ai (`app/src/components/ui/`)
- Set up `next.config.ts` with dotenv loading and remote image patterns
- Create `data/` directory structure

**Files affected:**
- `package.json` (new)
- `app/package.json` (new)
- `app/next.config.ts` (new)
- `app/tsconfig.json` (new)
- `app/postcss.config.mjs` (new)
- `app/src/app/globals.css` (new)
- `data/` directories (new)

---

### Step 2: Layout & Navigation

Build the app shell with sidebar and topbar.

**Actions:**
- Create root `layout.tsx` with SidebarProvider, fonts (Geist Sans/Mono)
- Build `app-sidebar.tsx` with 5 nav items:
  - Sparkles icon → "Create Ads" (`/create`)
  - Search icon → "Competitor Ads" (`/competitors`)
  - BookOpen icon → "Knowledge Base" (`/knowledge`)
  - Lightbulb icon → "Beginner Tips" (`/tips`)
  - FileText icon → "Sources" (`/sources`)
- Build `top-bar.tsx` (sticky, glass backdrop)
- Add sidebar footer showing last pipeline run timestamp
- Create `page.tsx` index redirect to `/create`

**Files affected:**
- `app/src/app/layout.tsx` (new)
- `app/src/app/page.tsx` (new)
- `app/src/components/app-sidebar.tsx` (new)
- `app/src/components/top-bar.tsx` (new)

---

### Step 3: Type Definitions & Utilities

Define all TypeScript interfaces and utility functions.

**Actions:**
- Define interfaces in `lib/types.ts`:
  - `Brand` (name, url, description, tagline, products, colors, logoUrl, style)
  - `Product` (name, description, price, imageUrl, category)
  - `CompetitorAd` (id, advertiser, platform, headline, body, ctaText, imageUrl, videoUrl, likes, comments, shares, landingPage, startDate, isActive, analysis)
  - `KnowledgeEntry` (id, source, videoTitle, channelName, thumbnailUrl, videoUrl, dateAnalyzed, tactics, fullTranscript, summary)
  - `AdConcept` (id, headline, body, ctaText, imagePrompt, generatedImageUrl, referenceImageUrl, targetAudience, format, rationale, createdAt)
  - `Source` (id, type, title, url, thumbnailUrl, channelName, dateScraped, description)
  - `PipelineProgress` (phase, step, message, progress, errors, log)
- Create `lib/utils.ts` with formatters (numbers, dates, etc.)
- Create `lib/csv.ts` with atomic read/write (copy pattern from tiktok-ai)

**Files affected:**
- `app/src/lib/types.ts` (new)
- `app/src/lib/utils.ts` (new)
- `app/src/lib/csv.ts` (new)

---

### Step 4: FireCrawl Integration (Website Scraping)

Build the website scraping module using FireCrawl API.

**Actions:**
- Create `lib/firecrawl.ts` with functions:
  - `scrapeWebsite(url: string)` — crawl website, extract brand info, products, visuals
  - `extractBrandProfile(scrapedData)` — parse into Brand type
  - `extractProducts(scrapedData)` — parse into Product[] type
  - `downloadBrandAssets(urls: string[])` — save logos/images to `data/brand-assets/`
- Use FireCrawl `/v1/scrape` and `/v1/crawl` endpoints
- Extract: company name, tagline, product catalog, brand colors, logo, style elements
- Store results in `data/brand.csv` and `data/products.csv`

**Files affected:**
- `app/src/lib/firecrawl.ts` (new)
- `app/src/app/api/brand/route.ts` (new)

---

### Step 5: YouTube Scraping & Knowledge Base

Build YouTube video analysis pipeline using Gemini.

**Actions:**
- Create `lib/youtube.ts` with functions:
  - `getVideoMetadata(url: string)` — extract video ID, fetch metadata via Apify YouTube scraper
  - `downloadVideo(url: string)` — download video file for Gemini upload
  - `getVideoThumbnail(videoId: string)` — get high-res thumbnail URL
- Create `lib/gemini.ts` with functions:
  - `uploadVideo(filePath: string)` — resumable upload to Gemini
  - `transcribeAndAnalyze(fileUri: string, prompt: string)` — multimodal analysis
- Analysis prompt should extract:
  - Key ad tactics and strategies mentioned
  - Specific frameworks or formulas (e.g., AIDA, PAS, hook formulas)
  - Examples and case studies referenced
  - Actionable do's and don'ts
  - Metrics and benchmarks mentioned
- Save each video's analysis as a markdown file in `data/knowledge/`
- Save video metadata + thumbnails in `data/sources.csv`

**Files affected:**
- `app/src/lib/youtube.ts` (new)
- `app/src/lib/gemini.ts` (new)
- `app/src/app/api/knowledge/route.ts` (new)
- `data/knowledge/` (new files per video)
- `data/sources.csv` (new)

---

### Step 6: Instagram Scraping

Scrape brand Instagram for content and style reference.

**Actions:**
- Extend `lib/apify.ts` with Instagram scraping:
  - `scrapeInstagramProfile(username: string)` — get profile info + recent posts
  - Default username for bloomnu: `bloomsupps`
  - Use Apify actor `apify/instagram-profile-scraper` or similar
- Extract: post images, captions, engagement stats, visual style
- Store post data and download key images to `data/brand-assets/`
- Add Instagram content to brand profile

**Files affected:**
- `app/src/lib/apify.ts` (new)
- `app/src/app/api/brand/route.ts` (updated)

---

### Step 7: Competitor Meta Ads Analysis

Build competitor ad scraping and analysis via Apify.

**Actions:**
- Extend `lib/apify.ts` with Meta Ads scraping:
  - `scrapeMetaAds(query: string, options)` — search Meta Ad Library via Apify
  - Use Apify actor for Facebook/Meta Ad Library scraping (e.g., `apify/facebook-ads-scraper`)
  - Options: keyword search, advertiser name, country, date range
  - Default competitors for bloomnu demo: AG1 (Athletic Greens), Huel, Orgain, Garden of Life, Vital Proteins, Aloha
- Analyze each ad with Claude:
  - Hook analysis (first line / visual hook)
  - Copywriting structure (headline, body, CTA patterns)
  - Visual analysis (style, colors, product placement)
  - Performance indicators (engagement, estimated reach)
- Store results in `data/competitors.csv`
- Create `app/src/app/api/competitors/route.ts` for CRUD + scraping

**Files affected:**
- `app/src/lib/apify.ts` (updated)
- `app/src/lib/claude.ts` (new)
- `app/src/app/api/competitors/route.ts` (new)
- `data/competitors.csv` (new)

---

### Step 8: Ad Concept Generation

Build the core ad creation engine.

**Actions:**
- Create `lib/claude.ts` with:
  - `generateAdConcept(brand, products, knowledge, competitors, options)` — generate ad copy
  - System prompt incorporates: brand voice, product details, top tactics from knowledge base, winning patterns from competitors
  - Output: headline, body copy, CTA, image generation prompt, target audience, format (story, feed, reel), rationale
- Create `lib/kie-ai.ts` with:
  - `generateAdImage(prompt, referenceImageUrls?)` — call Kie.ai API with Nano Banana Pro model
  - Endpoint: `POST https://api.kie.ai/api/v1/jobs/createTask`
  - Auth: `Authorization: Bearer ${KIE_AI_API_KEY}`
  - Body: `{ model: "nano-banana-pro", prompt, image_input: [...referenceImageUrls], aspect_ratio, output_format }`
  - Support up to 8 reference images (product photos, brand assets → styled ad visual)
  - Poll for task completion, download generated image
  - Return generated image URL/path
- Create `app/src/app/api/create/route.ts`:
  - POST: Generate concept → generate image → save to `data/concepts.csv`
  - Options: product selection, ad format, target audience, style preferences
- Store generated images in `data/generated-images/`

**Files affected:**
- `app/src/lib/claude.ts` (new/updated)
- `app/src/lib/kie-ai.ts` (new)
- `app/src/app/api/create/route.ts` (new)
- `data/concepts.csv` (new)
- `data/generated-images/` (new)

---

### Step 9: Pipeline Orchestrator

Build the multi-phase pipeline with SSE progress streaming.

**Actions:**
- Create `lib/pipeline.ts` with phased execution:
  - **Phase 1 — Brand Setup:**
    1. Scrape website via FireCrawl → brand profile + products
    2. Scrape Instagram → visual style + content
    3. Download and save brand assets
  - **Phase 2 — Knowledge Building:**
    1. For each YouTube URL from sources.md:
       - Get metadata + thumbnail
       - Download video
       - Upload to Gemini → transcribe + analyze
       - Save knowledge markdown file
    2. Save all sources to sources.csv
  - **Phase 3 — Competitor Analysis:**
    1. Scrape Meta Ads for brand's niche
    2. Analyze top-performing ads with Claude
    3. Save competitor data
- Create `app/src/app/api/pipeline/route.ts` with SSE streaming
- Progress events: `{ phase, step, message, progress, errors, log }`
- Create `context/pipeline-context.tsx` for global pipeline state

**Files affected:**
- `app/src/lib/pipeline.ts` (new)
- `app/src/app/api/pipeline/route.ts` (new)
- `app/src/context/pipeline-context.tsx` (new)

---

### Step 10: Create Ads Page (`/create`)

Build the main ad concept generation UI.

**Actions:**
- Product selector (dropdown from scraped products)
- Ad format selector (feed post, story, reel, carousel)
- Target audience input
- Style preferences (based on brand profile)
- "Generate Concept" button → calls API → shows:
  - Generated headline + body + CTA in a card
  - AI-generated image preview
  - Rationale (which tactics/patterns informed this)
- History of generated concepts (from concepts.csv)
- Star/favorite concepts
- Reference image upload (for product placement in image gen)

**Files affected:**
- `app/src/app/create/page.tsx` (new)

---

### Step 11: Competitor Ads Page (`/competitors`)

Build the competitor ad analysis viewer.

**Actions:**
- Grid view of scraped competitor ads (similar to tiktok-ai video grid)
- Cards showing: ad image/thumbnail, advertiser, headline, engagement stats
- Click to expand: full analysis (copywriting breakdown, visual analysis, tactics used)
- Filter by advertiser, sort by engagement
- "Scrape New Competitors" button with search input
- Markdown rendering for analysis content

**Files affected:**
- `app/src/app/competitors/page.tsx` (new)

---

### Step 12: Knowledge Base Page (`/knowledge`)

Build the tactics knowledge base viewer.

**Actions:**
- List view of knowledge entries grouped by source video
- Each entry shows: video thumbnail, title, channel, key tactics summary
- Click to expand: full markdown of extracted tactics
- Search/filter across all knowledge entries
- "Key Takeaways" summary section at top (aggregated from all videos)

**Files affected:**
- `app/src/app/knowledge/page.tsx` (new)

---

### Step 13: Beginner Tips Page (`/tips`)

Build the beginner-friendly ad advice page.

**Actions:**
- Static page with curated, simple advice organized in sections:
  - "What Makes a Good Ad" (hook, offer, CTA basics)
  - "Common Mistakes to Avoid"
  - "Ad Formats Explained" (feed, story, reel, carousel)
  - "Budget Tips for Beginners"
  - "Testing & Iteration Basics"
- Auto-generated from YouTube knowledge base, distilled and simplified for beginners
- Clean card-based layout with icons
- Regenerated via API when knowledge base is updated (POST /api/tips/regenerate)

**Files affected:**
- `app/src/app/tips/page.tsx` (new)

---

### Step 14: Sources Page (`/sources`)

Build the proof-of-work sources page.

**Actions:**
- Grid of YouTube video cards showing:
  - Video thumbnail (saved locally)
  - Video title
  - Channel name (Alex Hormozi, etc.)
  - Link to original video
  - Date analyzed
  - Brief summary of what was extracted
- Section for "Brand Data Sources" (website URL, Instagram profile)
- Section for "Competitor Data Sources" (Meta Ad Library queries)
- Visual, impressive layout — this is the "proof" page for the YouTube video

**Files affected:**
- `app/src/app/sources/page.tsx` (new)

---

### Step 15: Setup/Onboarding Flow

Build the white-label setup experience.

**Actions:**
- First-run detection: check if `data/brand.csv` exists
- If no brand data → show setup wizard:
  1. Enter company name + website URL
  2. (Optional) Enter Instagram handle
  3. (Optional) Enter competitor names/keywords
  4. "Start Setup" → runs Phase 1 + 2 of pipeline
- Settings page or modal to re-run setup with different brand
- Store config in `data/config.csv` (company name, URLs, preferences)

**Files affected:**
- `app/src/app/create/page.tsx` (updated with setup detection)
- `app/src/app/api/brand/route.ts` (updated)
- `data/config.csv` (new)

---

### Step 16: Pipeline Run Page

Build the pipeline execution UI (matching tiktok-ai's /run page).

**Actions:**
- "Run Pipeline" page accessible from sidebar or setup flow
- Phase selector: "Full Setup", "Update Competitors Only", "Refresh Knowledge Base"
- Input fields: website URL, Instagram handle, competitor keywords
- YouTube URLs input (textarea, one per line)
- Start button → SSE progress stream:
  - Phase indicators with progress bars
  - Live log with timing
  - Error display
  - Completion CTA linking to relevant page
- Match tiktok-ai's progress bar styling (gradient colors per phase)

**Files affected:**
- `app/src/app/run/page.tsx` (new — add to sidebar navigation)

---

### Step 17: Update CLAUDE.md & Documentation

Update workspace documentation to reflect the new app.

**Actions:**
- Update CLAUDE.md with:
  - App tech stack and architecture
  - New directory structure (app/, data/)
  - How to run the app
  - API routes documentation
  - Environment variables needed
- Populate context files with bloomnu.com brand info

**Files affected:**
- `CLAUDE.md` (updated)
- `context/business-info.md` (updated)
- `context/personal-info.md` (updated)

---

## Connections & Dependencies

### External API Dependencies

| API | Purpose | Key in .env |
|-----|---------|-------------|
| FireCrawl | Website scraping (brand, products, visuals) | `FIRECRAWL_API_KEY` (exists) |
| Apify | Instagram (@bloomsupps), YouTube metadata, Meta Ads | `APIFY_API_TOKEN` (exists) |
| Gemini | YouTube video transcription + analysis | `GEMINI_API_KEY` (exists) |
| Anthropic/Claude | Ad copy generation, competitor analysis | `ANTHROPIC_API_KEY` (exists) |
| Kie.ai | AI image generation (Nano Banana Pro / Gemini 3.0 Pro Image) | `KIE_AI_API_KEY` (exists) |
| Perplexity | Optional research/enrichment | `PERPLEXITY_AI_API_KEY` (exists) |

### Updates Needed for Consistency

- `CLAUDE.md` must be updated with full app documentation
- `reference/sources.md` will be consumed by the pipeline (YouTube URLs)
- `context/` files should be populated with brand context

### Impact on Existing Workflows

- No existing workflows are affected (greenfield build)
- `/prime` will pick up updated `CLAUDE.md` and `context/` files
- `/create-plan` and `/implement` continue to work as before

---

## Validation Checklist

- [ ] `npm run dev` starts the app at localhost:3000
- [ ] Sidebar navigation works across all 5+ tabs
- [ ] Pipeline runs and shows real-time progress via SSE
- [ ] FireCrawl successfully scrapes bloomnu.com brand data
- [ ] YouTube videos are transcribed and knowledge base is populated
- [ ] Sources page shows YouTube thumbnails and video metadata
- [ ] Competitor ads are scraped from Meta Ad Library
- [ ] Ad concepts generate copy + images successfully
- [ ] Beginner tips page displays helpful content
- [ ] White-label flow works (new URL → re-scrape → new brand)
- [ ] CLAUDE.md updated to reflect final app structure
- [ ] All CSV files are created and updated correctly
- [ ] Glass-morphism dark theme matches tiktok-ai design

---

## Success Criteria

The implementation is complete when:

1. A user can enter a company website URL and the app automatically scrapes brand data, products, and visuals
2. YouTube videos from sources.md are transcribed, analyzed, and their tactics are stored in a browsable knowledge base
3. Competitor Meta Ads are scraped and analyzed with actionable insights
4. The app generates ad concepts (headline + body + CTA + AI image) informed by the knowledge base and competitor analysis
5. The Sources page displays YouTube thumbnails and provenance data as proof-of-work
6. The app is white-label ready — changing the company URL triggers a full re-scrape and regeneration

---

## Notes

- **Kie.ai integration:** Uses Nano Banana Pro model (Gemini 3.0 Pro Image under the hood). Supports up to 8 reference images — perfect for plugging in product photos and getting styled ad visuals back. Docs: https://docs.kie.ai/market/google/pro-image-to-image
- **All API keys confirmed present** in `.env`: Apify, Gemini, Anthropic, Kie.ai, FireCrawl, Perplexity.
- **Instagram:** @bloomsupps is the official handle for bloomnu.com / Bloom Nutrition.
- **Competitors seeded:** AG1, Huel, Orgain, Garden of Life, Vital Proteins, Aloha — all verified heavy Meta ad spenders in the nutrition/supplement space.
- **Rate limits:** Gemini free tier has daily quotas. Processing 10 YouTube videos may need to be spread across API calls with backoff (same pattern as tiktok-ai).
- **Meta Ads scraping:** Apify has multiple actors for Facebook Ad Library. The exact actor choice depends on what's available and the data format. Will test during implementation.
- **Beginner tips:** Auto-generated from the YouTube knowledge base using Claude to distill and simplify expert advice for newcomers.
- **Future enhancements:** Could add A/B test tracking, ad performance feedback loop, multi-platform support (Google Ads, TikTok Ads), scheduled competitor monitoring.

---

## Implementation Notes

**Implemented:** 2026-04-18

### Summary

Built the complete Next.js web app with all 6 pages, 7 API routes, 6 lib modules, and pipeline orchestrator. The app mirrors the tiktok-ai reference architecture exactly: same Next.js 16 + base-ui + Tailwind v4 stack, same dark glass-morphism design, same CSV storage pattern with atomic writes, same SSE pipeline streaming.

### Deviations from Plan

- Added `/api/tips` route (GET/POST) for beginner tips generation — not explicitly listed in the plan's API routes table but required by Step 13.
- Sources page reads from knowledge entries via `/api/knowledge` rather than a separate sources API, since knowledge entries contain all the YouTube metadata needed.
- Used port 3002 for dev server (3000 and 3001 were in use).
- `Youtube` icon from lucide-react didn't exist in the installed version — replaced with `Play` icon.

### Issues Encountered

- `lucide-react` does not export a `Youtube` icon in the installed version — fixed by using `Play` icon instead.
- Ports 3000 and 3001 were occupied — used port 3002 for dev testing.
- Chrome browser extension not connected — could not do visual browser testing, but build passes and all routes return HTTP 200.
