# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

A **white-label AI ad creation tool** — a hybrid system (Claude Code chat + web UI) where users collect brand context agentically, find competitors through the Meta Ad Library, analyze winning ad patterns, and generate ad concepts with AI-written copy and AI-generated visuals. Built as a Next.js app with a dark glass-morphism UI.

The tool is designed for **multiple users with different brands** — not a single-brand tool. Brand context is stored as JSON and brand switching is straightforward.

**This file (CLAUDE.md) is the foundation.** It is automatically loaded at the start of every session. Keep it current — it is the single source of truth for how Claude should understand and operate within this workspace.

---

## User Workflow (4-Stage Flow)

The app guides users through a clear 4-step flow. The sidebar shows step completion indicators (green checkmarks when done, numbered circles when not).

1. **Brand Context** (`/brand`) — Collect brand information via Claude Code chat (`/collect-brand`) or the web form (URL + Instagram). The app crawls sites, scrapes Instagram, extracts products, downloads visuals, AI-analyzes brand identity, and optionally runs Gemini vision analysis on brand images/videos. Brand avatar priority: IG profile pic (circle) → favicon (centered) → placeholder icon. Products and Visuals sections are collapsible with clickable items that open in a full-screen lightbox. **Changing the brand automatically clears all downstream data** (search results, analysis, concepts, competitor ads, generated images) so steps 2-4 reset.
2. **Find Competitors** (`/competitors`) — Keyword-based Meta Ad Library search. Keywords auto-populate from brand context (same keywords shown on the brand page). Scrapes in **parallel batches of 3 keywords** (~10-30s per batch). Groups by advertiser, scores by performance signals, ranks. Ad cards support inline video playback (click play, click to pause, mute/unmute) and link to the original Meta Ad Library entry. Progress UI shows elapsed time, per-batch estimates, and smooth progress bar.
3. **What's Working** (`/analysis`) — Claude analyzes top 25 competitor ads and produces two outputs: **deep hook analysis** (per-ad: exact hook text, technique, visual description, psychology, effectiveness 1-10, video first-3-5-seconds) displayed FIRST as the most prominent section, and **winning patterns** (5-8 patterns with hookAnalysis paragraphs). Each example includes a **clickable thumbnail** — video ads open in a video player lightbox, static ads open full-size. Hook data flows into concept generation for stronger hooks.
4. **Create Ads** (`/create`) — Compact generation bar at top (count input + generate button + product toggles). Dynamically pairs top competitor ads with brand products. Generates configurable number of concepts (1-30) in **parallel batches of 3**. **Format-aware**: video reference ads produce video concepts (scene-by-scene script + key frame image), static reference ads produce static concepts. **Clean card design**: side-by-side images at natural aspect ratio (no cropping), glass action buttons ("Ad Copy", "Video Script", "Strategy") reveal details in a glass-morphism modal. QC runs silently — only passing concepts are shown. Generated image aspect ratio matches the reference ad (9:16, 4:5, or 1:1).

The **Knowledge Base** (`/knowledge`) is foundational reference material — expert ad tactics extracted from YouTube videos. Accessible from the sidebar below the 4 steps.

**Pages removed from sidebar** (still accessible via URL): `/run` (legacy pipeline), `/tips` (beginner tips), `/sources` (video provenance).

## The Claude-User Relationship

Claude operates as an **agent assistant** with access to the workspace folders, context files, commands, and outputs. The relationship is:

- **User (Oleg)**: Defines goals, provides context about the product vision, and directs work through commands
- **Claude**: Reads context, understands the objectives, executes commands, produces outputs, and maintains workspace consistency

Claude should always orient itself through `/prime` at session start, then act with full awareness of who the user is, what they're trying to achieve, and how this workspace supports that.

---

## Workspace Structure

```
.
├── CLAUDE.md              # This file — core context, always loaded
├── GETTING-STARTED.md     # User-facing setup guide
├── .env.example           # API key template
├── .claude/
│   └── commands/          # Slash commands Claude can execute
│       ├── prime.md       # /prime — session initialization
│       ├── create-plan.md  # /create-plan — create implementation plans
│       ├── implement.md   # /implement — execute plans
│       └── collect-brand.md # /collect-brand — agentic brand context collection
├── app/                   # Next.js web application
│   ├── src/
│   │   ├── app/           # Pages and API routes
│   │   │   ├── api/       # brand, brand-context, search, analysis, competitors, create, knowledge, pipeline, tips, proxy-image, status
│   │   │   ├── brand/     # Brand context viewer (collapsible products/visuals, lightbox)
│   │   │   ├── competitors/ # Keyword search + advertiser ranking (video playback, ad library links)
│   │   │   ├── analysis/  # "What's Working" pattern analysis
│   │   │   ├── create/    # Ad concept generation page (configurable count, product selector, QC badges)
│   │   │   ├── knowledge/ # Tactics knowledge base
│   │   │   ├── tips/      # Beginner ad tips
│   │   │   ├── sources/   # YouTube video provenance
│   │   │   └── run/       # Legacy pipeline UI
│   │   ├── components/    # App sidebar, MetaAdCard (video+lightbox), UI components (shadcn)
│   │   ├── lib/           # API integrations (firecrawl, apify, gemini, claude, kie-ai, competitor-scoring, quality-control, csv, pipeline)
│   │   ├── hooks/         # use-mobile
│   │   └── context/       # pipeline-context
│   ├── vitest.config.ts   # Test configuration
│   ├── package.json
│   └── next.config.ts
├── data/                  # Runtime data (JSON, CSV files, knowledge markdown, images)
│   ├── brand-context.json # Brand context (primary, replaces brand.csv)
│   ├── search-results.json # Search state + scored advertisers
│   ├── analysis.json      # "What's Working" analysis
│   ├── archive/           # Archived old brand data (Bloom)
│   ├── brand-assets/      # Downloaded brand images/logos
│   ├── competitor-ads/    # Downloaded competitor ad images by advertiser
│   ├── knowledge/         # Per-video markdown analysis files
│   └── generated-images/  # AI-generated ad images
├── context/               # Background context about the user and project
├── plans/                 # Implementation plans
├── outputs/               # Work products and deliverables
└── reference/             # Templates, examples, reusable patterns
```

**Key directories:**

| Directory    | Purpose                                                                             |
| ------------ | ----------------------------------------------------------------------------------- |
| `app/`       | Next.js web app — ad creation tool with dark glass-morphism UI.                    |
| `data/`      | Runtime data: JSON context files, CSV storage, knowledge base, brand assets, generated images. |
| `context/`   | Who the user is, their role, current priorities, strategies. Read by `/prime`.      |
| `plans/`     | Detailed implementation plans. Created by `/create-plan`, executed by `/implement`. |
| `outputs/`   | Deliverables, analyses, reports, and work products.                                 |
| `reference/` | Helpful docs, templates and patterns to assist in various workflows.                |

---

## Commands

### /prime

**Purpose:** Initialize a new session with full context awareness.

Run this at the start of every session. Claude will:

1. Read CLAUDE.md and context files
2. Summarize understanding of the user, workspace, and goals
3. Confirm readiness to assist

### /create-plan [request]

**Purpose:** Create a detailed implementation plan before making changes.

Use when adding new functionality, commands, scripts, or making structural changes. Produces a thorough plan document in `plans/` that captures context, rationale, and step-by-step tasks.

Example: `/create-plan add a competitor analysis command`

### /implement [plan-path]

**Purpose:** Execute a plan created by /create-plan.

Reads the plan, executes each step in order, validates the work, and updates the plan status.

Example: `/implement plans/2026-01-28-competitor-analysis-command.md`

### /collect-brand

**Purpose:** Agentically collect brand context from whatever the user provides.

Guides the user through providing URLs, files, Instagram handles, keywords, or descriptions. Claude crawls, scrapes, analyzes, and builds a complete brand context profile. Optionally runs Gemini vision analysis on brand images.

---

## Critical Instruction: Maintain This File

**Whenever Claude makes changes to the workspace, Claude MUST consider whether CLAUDE.md needs updating.**

After any change — adding commands, scripts, workflows, or modifying structure — ask:

1. Does this change add new functionality users need to know about?
2. Does it modify the workspace structure documented above?
3. Should a new command be listed?
4. Does context/ need new files to capture this?

If yes to any, update the relevant sections. This file must always reflect the current state of the workspace so future sessions have accurate context.

---

## Session Workflow

1. **Start**: Run `/prime` to load context
2. **Work**: Use commands or direct Claude with tasks
3. **Plan changes**: Use `/create-plan` before significant additions
4. **Execute**: Use `/implement` to execute plans
5. **Maintain**: Claude updates CLAUDE.md and context/ as the workspace evolves

---

## Web App

### Tech Stack

- **Framework:** Next.js 16.2.4, React 19, TypeScript
- **Styling:** Tailwind CSS v4 (oklch colors), shadcn/ui (base-ui v1.4.0), dark glass-morphism theme
- **Testing:** Vitest (30 unit tests covering scoring, JSON storage, type contracts)
- **APIs:** Anthropic (Claude Sonnet), FireCrawl, Apify, Kie.ai, Gemini (vision analysis)
- **Data:** JSON for brand context/search/analysis, CSV for tabular data (products, ads, concepts) with atomic writes in `data/`
- **Streaming:** SSE (Server-Sent Events) for real-time progress during scraping/search/generation with heartbeat events

### Running the App

```bash
npm run dev     # Start dev server (proxies to app/)
npm run build   # Production build
npx vitest run  # Run unit tests
```

### Environment Variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API — ad copy generation, competitor analysis, pattern analysis, QC |
| `GEMINI_API_KEY` | Gemini — brand image/video visual analysis |
| `FIRECRAWL_API_KEY` | FireCrawl — website scraping |
| `APIFY_API_TOKEN` | Apify — Instagram, Meta Ad Library scraping |
| `KIE_AI_API_KEY` | Kie.ai — AI image generation (Nano Banana Pro) |

### App Pages

| Route | In Sidebar | Purpose |
|-------|-----------|---------|
| `/brand` | Yes (Step 1) | **Brand Context** — view collected brand data. IG profile pic as avatar (fallback: favicon → placeholder). Collapsible Products & Visuals sections. Clickable images open full-screen lightbox. Web form for quick scraping, or use `/collect-brand`. |
| `/competitors` | Yes (Step 2) | **Find Competitors** — keyword-based Meta Ad Library search. Edit keywords, set ads-per-keyword, see scored advertiser rankings. Expandable ad grids with inline video playback (play/pause/mute) and "Ad Library" links. Progress bar with elapsed timer and per-keyword estimates. |
| `/analysis` | Yes (Step 3) | **What's Working** — Deep hook analysis (top 15 hooks displayed first with exact text, technique, visual, psychology) + winning patterns. Hook data flows into ad generation. |
| `/create` | Yes (Step 4) | **Create Ads** — compact generation bar (count + generate + product toggles). Side-by-side images at natural aspect ratio. Glass action buttons reveal ad copy, video script, strategy in a modal. QC runs silently — only passing concepts shown. |
| `/knowledge` | Yes (reference) | Browse expert ad tactics extracted from YouTube videos (foundational, one-time data). |
| `/tips` | No | Beginner-friendly ad advice (auto-generated from knowledge base). |
| `/sources` | No | Proof-of-work: YouTube thumbnails and data provenance. |
| `/run` | No | Legacy pipeline UI — kept for direct URL access but superseded by the 4-step flow. |

### API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/brand` | GET, POST | GET: brand profile + products + assets (reads both JSON and legacy CSV). POST: scrape brand with SSE progress, writes both JSON context and legacy CSV. |
| `/api/brand-context` | GET, PUT | GET: brand context JSON + products + assets. PUT: save brand context directly (used by `/collect-brand`). |
| `/api/search` | GET, POST | GET: current search state. POST `action: "search"`: keyword-based Meta Ad Library search with SSE + heartbeat + scoring. POST `action: "suggest-keywords"`: extract keywords from brand context. |
| `/api/analysis` | GET, POST | GET: existing analysis. POST: run "What's Working" pattern analysis via Claude. |
| `/api/competitors` | GET | Legacy endpoint. GET `?type=meta-ads`: returns scraped Meta ads. |
| `/api/status` | GET | Step completion check: `{ hasBrand, hasSearch, hasAnalysis, competitorCount, metaAdCount, conceptCount, knowledgeCount }`. |
| `/api/knowledge` | GET | List knowledge entries or get markdown by id |
| `/api/create` | GET, POST, PATCH | List/generate/star ad concepts |
| `/api/create/batch` | POST | Batch-generate concepts with dynamic pairing, aspect ratio detection, QC gate, SSE streaming. Accepts `{ count, productNames }`. |
| `/api/pipeline` | POST | Legacy pipeline with SSE streaming |
| `/api/tips` | GET, POST | Get/regenerate beginner tips |
| `/api/proxy-image` | GET | Proxy local or remote images |

---

## Key Architecture Details

### Brand Context Collection

Brand context can be collected two ways:
1. **Web form** (`/api/brand` POST) — crawls website, scrapes Instagram, scrapes YouTube (with video transcript analysis), saves both `brand-context.json` and legacy `brand.csv`
2. **Claude Code** (`/collect-brand` command) — agentically collects from any input (URLs, files, keywords), saves via `/api/brand-context` PUT

Brand context is stored as `data/brand-context.json` (primary) with legacy `data/brand.csv` as fallback. All APIs check both.

**YouTube scraping** (when YouTube URL provided):
1. Scrapes channel metadata (name, description, subscriber count) via `streamers~youtube-scraper`
2. Scrapes up to 3 recent videos with transcripts via `bernardo~youtube-scraper`
3. Analyzes video transcripts with Claude to extract: brand themes, tone, messaging, target audience, content style, key topics
4. Stores analysis in `brandContext.youtubeContentAnalysis` field
5. Falls back gracefully if transcripts unavailable

### Brand Page UX

- **Visual-first layout**: Visuals gallery is always visible right below the brand identity card — no toggle, always expanded. This is the first thing users see after the brand name.
- **Avatar priority**: Instagram profile pic (rounded circle, `object-cover`) → favicon (centered, `object-contain`, padded) → gradient placeholder icon. Never use the website logo — it crops terribly at small sizes.
- **Description collapsed**: Brand description shows max 2 lines with "Show more" toggle. Keeps the identity card compact.
- **Inline attribute chips**: Colors, Visual Style, and Category displayed as a single compact row of labeled chips — not 3 separate cards.
- **Products section**: collapsible via chevron header, **expanded by default**. Each product card is clickable — opens product image in full-screen lightbox overlay.
- **Details section**: Visual Analysis (Gemini), YouTube Content Analysis, Keywords, and Sources grouped under a collapsible "Details" toggle, **collapsed by default**. Keeps text below the fold.
- **Visuals section**: always expanded, no toggle. Each thumbnail is clickable — opens full-size in lightbox. Lightbox has X close button, click-outside-to-close, and click-on-image does NOT close.

### Brand Scraping Flow (`/api/brand` POST)

1. FireCrawl crawls up to 15 pages (v1 API: `/v1/crawl` with polling)
2. `extractBrandProfile()` pulls basic metadata (title, og:image, favicon)
3. `analyzeBrandIdentity()` sends all page content to Claude for AI analysis
4. `extractProductsWithClaude()` extracts products via Claude with image matching
5. Downloads: favicon, up to 15 website images, profile pic, up to 12 Instagram images
6. If YouTube URL provided: scrapes 3 videos with transcripts, analyzes content with Claude
7. Saves brand profile to both CSV and JSON, products to CSV

### Competitor Search Flow (`/api/search` POST)

1. `action: "suggest-keywords"` — reads brand context, calls `extractKeywords()` from competitor-scoring.ts. Returns the same keywords shown on the brand page.
2. `action: "search"` — keywords are processed in **parallel batches of 3**:
   - Each keyword: scrapes Meta Ad Library via Apify, downloads ad thumbnails to `data/competitor-ads/{slug}/`
   - After all keywords: saves all ads to `meta-ads.csv`, runs `scoreAdvertisers()`, saves `SearchState` to `data/search-results.json`
3. SSE streams progress per keyword with 10-second heartbeat during Apify calls
4. Each batch of 3 keywords takes ~10-30 seconds (parallel Apify scrape + image download)
5. Apify call has 240-second client-side timeout to prevent hanging

### MetaAdCard Component

The `MetaAdCard` component handles display of both competitor and generated ads:
- **Image props** (use the right one): `imageSrc` (pass-through), `localImagePath` (gets proxy-wrapped), `imageUrl` (gets proxy-wrapped)
- **Video support**: `videoUrl` prop enables inline playback. Click thumbnail play button to start, click video to pause, mute/unmute button in bottom-right. Play button overlay is transparent by default, darkens only on hover.
- **Ad Library link**: `adId` prop generates a link to `facebook.com/ads/library/?id=...`. On the create page, this link is in the label row above the image (not overlaid on the image).
- **Status badges**: Active/Inactive, Video indicator, days running (amber for 30+ days).
- **`showCopy` prop**: When `false`, renders in embedded mode — no Card wrapper, no text section. Image shows at natural aspect ratio with `max-h-[320px]`, `rounded-xl`, centered. Used on the Create Ads page for clean side-by-side comparison.

### "What's Working" Analysis (`/api/analysis` POST)

1. Reads all meta-ads sorted by daysRunning
2. Sends top 25 ads (tagged `[VIDEO]`/`[STATIC]`) to Claude via `analyzeWinningPatterns()`
3. **Deep hook analysis**: extracts per-ad hooks with exact hook text, technique, visual description, why it works psychologically, effectiveness rating (1-10). Video ads get `videoFirstSeconds` describing the first 3-5 seconds.
4. Identifies 5-8 patterns with hook type, copy structure, emotional angle, offer type, visual approach. Each pattern includes a `hookAnalysis` paragraph.
5. Saves `AnalysisResult` (with `hooks[]` and `patterns[]`) to `data/analysis.json`
6. Analysis page shows **hooks FIRST** (top 15 by effectiveness) as the most prominent section, then summary, then patterns. Hooks are the #1 most important element — "When you wrote your title, you spent 80% of your advertising dollar."

### Ad Concept Generation Flow

**Batch generation** (`/api/create/batch` POST — primary flow):
1. Accepts `{ count, productNames }` — count defaults to 10 (1-30), productNames filters products
2. Dynamic pairing: distributes top ads (by daysRunning) across selected products
3. **Format detection**: checks `referenceAd.videoUrl` — video ads get a video concept (script + key frame), static ads get a static concept
4. `generateReplicaAdConcept()` generates copy + image prompt. **Product-first prompt structure**: product info comes first with explicit instruction to write about the assigned product, not the competitor's. Competitor ad is labeled "strategy reference only." **Hook analysis injected**: if available, the reference ad's deep hook analysis (technique, exact text, visual, psychology) is included in the prompt with explicit instruction to replicate the same hook mechanism.
5. **Aspect ratio detection**: reads the downloaded reference ad image dimensions (PNG/JPEG/WebP header parsing). Vertical (h/w > 1.4) → 9:16, slightly tall (> 1.1) → 4:5, else → 1:1.
6. Kie.ai generates image with competitor ad's `imageUrl` as reference input
7. **Quality control gate**: `evaluateCreative()` scores each concept on brand consistency (40%), copy quality (35%), strategic relevance (25%). **Threshold: 6.0/10**. QC receives the full product catalog so it doesn't flag legitimate products as "wrong category." Failed concepts get ONE retry with QC feedback.
8. Processes **3 concepts in parallel** (batches of 3), streams each via SSE as it completes
9. Replaces `concepts.csv` with the full batch
10. Progress includes elapsed timer, time estimate (~2 min per batch), and percentage

**Create page UI** — minimal, content-first design:
- **Compact generation bar** at top: number input + generate button + product filter toggles, all in one row. No title cards, no status summaries — concepts are the content.
- **Concept cards** (`max-w-5xl`, `glass rounded-2xl`): header with concept #, product, type badge, star button
- **Side-by-side images** at natural aspect ratio (no cropping, `max-h-[320px]`):
  - LEFT: Competitor reference with label row: "Reference · 127d · Ad Library ↗"
  - CENTER: Arrow
  - RIGHT: Brand version with "Your {brand} Version" label
- **Glass action buttons** below images: "Ad Copy", "Video Script" (video only), "Strategy" — open a glass-morphism Dialog modal with tabbed sections (purple/blue/amber active states)
- **QC is invisible to users** — no scores, no badges, no filter toggles. Failed concepts never reach the UI.

### Data Conventions

- Brand context: `data/brand-context.json` (primary), `data/brand.csv` (legacy fallback)
- Search state: `data/search-results.json` — keywords, scored advertisers, total ads
- Analysis: `data/analysis.json` — winning patterns, summary
- Old Bloom data: `data/archive/` — brand CSV, products, competitors, concepts, assets, generated images
- Brand asset files prefixed by source: `web-` (website), `ig-` (Instagram), `profile-pic.` (IG profile), `favicon.` (site icon)
- Competitor ad images stored in `data/competitor-ads/{advertiser-slug}/` with ad archive ID as filename
- `meta-ads.csv` stores scraped Meta Ad Library ads (includes `videoUrl` field)
- `concepts.csv` includes QC fields (`qualityScore`, `qualityFeedback`, `qcPassed`) and video fields (`adType`: "video"|"static", `videoScript`)
- `AdConcept` includes `description` (Meta link description), `placements` (comma-separated), `inspirationAdIds` (comma-separated Meta ad IDs)
- Images are served via `/api/proxy-image`

### Technical Gotchas

- **FireCrawl crawl API v1** returns data at TOP level (`page.markdown`, `page.metadata`), NOT nested under `.data`. Helper functions `getMarkdown()`/`getMetadata()` in `firecrawl.ts` handle both formats.
- **Product image matching** relies on Shopify's markdown convention: `![Product Name](image-url)`. The `extractProductImageMap()` function builds this mapping.
- **YouTube knowledge base** is completely separate from brand identity. Never mix YouTube thumbnails or video data into brand assets.
- **YouTube brand context analysis** scrapes up to 3 videos with transcripts from the brand's channel and analyzes them with Claude to extract brand themes, tone, messaging, and target audience. This is different from the knowledge base (which analyzes ad strategy videos).
- **YouTube analysis** uses Apify transcript scraper (`bernardo~youtube-scraper` for videos, `streamers~youtube-scraper` for channel metadata) + Claude text analysis — NOT Gemini video upload.
- **Image proxy double-wrapping** — `MetaAdCard` has three image props: `imageSrc` (pass-through, used as-is), `localImagePath` (raw path, gets proxy-wrapped), `imageUrl` (remote URL, gets proxy-wrapped). When a URL is already a proxy path, you MUST use `imageSrc`.
- **CSV boolean serialization** — `csv-stringify` writes `true` as `"1"` and `false` as empty string `""`. When reading booleans back, check for `=== true || === "true" || === "1"`. Empty string = false.
- **Meta Ad Library actor** — Use `curious_coder~facebook-ads-library-scraper` (community actor). Input format: `{ urls: [{ url: adLibraryUrl }], count: N }`. The parameter is `count` (NOT `max_ads` — that returns 400). Other params: `limitPerSource`, `scrapeAdDetails`, `scrapePageAds.period/activeStatus/sortBy/countryCode`. For keyword searches, only `count` and `urls` matter. The `scrapePageAds.*` params only apply when scraping a specific Facebook Page URL. Response may be flat array or `{ results: [...] }` — handle both.
- **Apify over-request multiplier** — `scrapeMetaAds()` requests more ads than the limit because many are video-only or DCO templates. Multiplier: 4x for limit ≤5, 6x for ≤10, 8x for >10. The Apify call has a 240-second client-side abort timeout.
- **Image prompts must include text overlays** — Most competitor ads are designed graphics with bold text baked into the image. The `imagePrompt` field must describe the full visual composition including exact text to render, typography style, layout, and placement.
- **Brand context fallback** — All APIs check `readBrandContext()` first, then `readBrand()` for legacy CSV. The brand API POST now writes both formats.
- **Brand avatar** — Never use `logoUrl` as the main avatar — website logos are often large banners that crop terribly at 80x80. Use IG profile pic first, then favicon.
- **Aspect ratio detection** — `detectAspectRatio()` in batch route reads PNG/JPEG/WebP headers to get dimensions. No external dependencies (pure buffer parsing). Vertical video thumbnails (1080x1920) → 9:16, feed images (1080x1080) → 1:1.
- **Page data loading** — The create page uses `Promise.all()` for all initial fetches (brand, concepts, status, meta-ads) to prevent race conditions where setup state evaluates before data loads.
- **Brand change clears downstream** — Both `/api/brand` POST and `/api/brand-context` PUT call `clearDownstreamData()` which deletes `search-results.json`, `analysis.json`, `meta-ads.csv`, `concepts.csv` and empties `competitor-ads/` and `generated-images/`. This ensures steps 2-4 reset when the brand changes.
- **Analysis ad IDs must be real** — The `analyzeWinningPatterns()` prompt labels each ad as `[ID: 1234567890]` with the actual Meta archive ID, and explicitly tells Claude to use these IDs in examples. Without this, Claude uses index numbers (1, 2, 3...) which don't match any real ads and thumbnails won't show.
- **Video concept generation** — `generateReplicaAdConcept()` checks `referenceAd.videoUrl` to determine format. Video ads get a different prompt that asks for a `videoScript` (scene-by-scene) plus a key frame `imagePrompt`. The `adType` field ("video"|"static") is stored on the concept.
- **Product-first prompt order** — In `generateReplicaAdConcept()`, the product info MUST come before the competitor ad in the prompt. When competitor ad content comes first, Claude latches onto the competitor's product category and generates copy about the wrong product. This was the #1 cause of QC failures.
- **QC needs product catalog** — `evaluateCreative()` receives the full `products[]` array. Without it, QC reads the brand's `category` field (e.g., "Hydration") and falsely flags legitimate products like "Clear Protein" as wrong-category. The product catalog tells QC which products are real.
- **MetaAdCard embedded mode** — When `showCopy={false}`, MetaAdCard renders as a plain `<div>` (not a `<Card>`), with the image at natural aspect ratio (`max-h-[320px] w-auto rounded-xl`). This avoids nested Card borders and forced aspect ratio cropping. The standard Card mode (competitors page) is unchanged.

---

## Data Quality Standards

Every scraping or data-processing feature MUST enforce these standards at the code level.

### Scraped Ad Quality Gates (enforced in `apify.ts`)

1. **Every ad must have a real image** — `hasImage()` filter rejects ads without `imageUrl`.
2. **No template variables** — `isDcoAd()` checks ALL text fields for `{{`.
3. **No duplicates** — Deduplicate by `primaryText.slice(0, 100)` before returning results.
4. **Every ad must have content** — reject ads where both primaryText and headline are empty.
5. **Images must be downloaded locally** — Meta CDN URLs expire.

### Quality Control (enforced in `quality-control.ts`)

1. Each generated concept is scored on brand consistency (40%), copy quality (35%), strategic relevance (25%)
2. **Score threshold: 6.0/10** to pass — catches real failures (wrong product, fabricated claims) while passing solid work
3. Failed concepts get ONE retry with QC feedback injected into the prompt
4. **QC receives the full product catalog** so it knows all brand products are legitimate (prevents false "wrong category" failures)
5. **QC is invisible to users** — scores/feedback are stored on the concept for debugging but NOT shown in the UI. No QC badges, no filter toggles.
6. **Generation prompt is product-first** — product info appears before competitor ad in the prompt, with explicit instruction to write about the assigned product. This prevents the #1 QC failure: copying the competitor's product claims instead of the brand's.

### Image Proxy Rules

- `MetaAdCard` component has three image input props — use the right one:
  - `imageSrc` — URL is already complete. Used for generated concept images.
  - `localImagePath` — raw relative path. Component builds the proxy URL.
  - `imageUrl` — remote URL. Component builds the proxy URL.
- **Never pass an already-proxied URL to `imageUrl` or `localImagePath`**.
- Also pass `videoUrl` and `adId` when available for video playback and Ad Library links.

---

## UX Standards

- **Never show frozen progress** — every long operation must have either a heartbeat, elapsed timer, or animated progress bar. If a step takes >5 seconds with no visual feedback, it's a bug.
- **Show time estimates** — tell users how long each step takes before they start it. Update estimates based on real measurements.
- **Show errors explicitly** — no silent failures. Every error must surface to the user with the actual error message, not just "Failed."
- **Video ads need playback** — most Meta ads are video. Show play button on thumbnail, support inline play/pause/mute. Lightbox must play video (not just show image) when clicking a video ad thumbnail.
- **Link to sources** — every scraped ad should link back to the Meta Ad Library entry via ad ID.
- **Collapsible sections** — long lists (products, visuals) should be collapsible with chevron toggles.
- **Clickable media** — images should open in a lightbox for full-size viewing. Videos should open in a video player lightbox.
- **Proof of work** — analysis insights must show actual ad thumbnails alongside examples, not just text excerpts. Thumbnails are clickable (image → lightbox, video → video player).
- **Brand change resets downstream** — when the user scrapes a new brand, all steps 2-4 data must be cleared automatically. The sidebar should reflect this immediately.
- **Keywords flow naturally** — keywords from brand context (Step 1) auto-populate in Find Competitors (Step 2). No disconnect between steps.
- **Parallel everything** — keyword searches run in batches of 3. Concept generation runs in batches of 3. Never make the user wait sequentially when work can be parallelized.
- **Format-aware generation** — if the reference ad is a video, generate a video concept (script + key frame). If static, generate a static ad. Show the ad type (Video/Static badge) clearly.
- **Visual-first pages** — every page must show compelling visuals above the fold without scrolling. Text-heavy content is condensed (inline chips), truncated (line-clamp), or folded (collapsed sections). A page full of images feels valuable; a page full of text feels like work.
- **Content-first pages** — the most valuable screen real estate is at the top. Never waste it on status summaries or metadata the user already knows. Put the primary content (concepts, ads, analysis) front and center. Controls should be compact.
- **Hide complexity behind beautiful buttons** — text-heavy details (ad copy, video scripts, rationale) should NOT be shown inline. Use glass-morphism buttons that open modal overlays with tabbed sections. Cards stay clean and visual.
- **Competitor card thumbnail grid** — each advertiser card shows up to 4 ad thumbnails in a 2-column grid at `aspect-[4/5]`. Thumbnails fill the card width — visuals should dominate the card, not text. Header is one compact line (rank + name + badges + chevron).
- **3-column competitor grid** — Find Competitors results page uses `xl:grid-cols-3` for advertiser cards. Expanded cards span all 3 columns.
- **2-column concept grid** — Create Ads page shows two concepts per row. Each concept shows reference ad (left) → gradient SVG arrow → generated ad (right) side by side. Arrow is a smooth purple gradient SVG that fades in from transparent to solid with a pointed arrowhead. Four images visible per row total.
- **2-column hook grid** — What's Working page shows hook cards in `lg:grid-cols-2` for higher visual density.
- **2-column knowledge grid** — Knowledge base shows two videos per row with 10% larger thumbnails (w-44). Expanded entries span full width.
- **Images at natural aspect ratio** — never crop ad images to a forced aspect ratio. Show 9:16 as vertical, 1:1 as square. Analysis hook thumbnails use `aspect-[3/4]` for consistent heights without aggressive cropping. Cap height with `max-h-[320px]` to keep cards compact.
- **Clean image overlays** — video play button overlays should be transparent by default, darken only on hover. Never put persistent dark overlays on images — both sides of a comparison should have equal brightness.
- **No internal metrics in UI** — QC scores, debug info, and system metadata should never be shown to end users. These are backend concerns.

---

## Notes

- Keep context minimal but sufficient — avoid bloat
- Plans live in `plans/` with dated filenames for history
- Outputs are organized by type/purpose in `outputs/`
- Reference materials go in `reference/` for reuse
- The user cares about polish — every UI element should have real data, never placeholder icons
- When modifying scraping logic, always clear old data and re-scrape to verify fixes work end-to-end
- `suggestCompetitors()` has been removed — competitors are found by keyword search, not LLM guessing
- Old Bloom brand data is archived in `data/archive/` — not deleted, in case it's needed for reference
