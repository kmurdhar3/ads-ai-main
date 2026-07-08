# Current Data

## App State

| Feature | Status | Notes |
| ------- | ------ | ----- |
| Brand context (`/brand`) | Done | Visual-first layout: visuals gallery always visible above fold, description clamped to 2 lines, attribute chips inline, Details section collapsed. Products expanded by default. Collects via web form or `/collect-brand`. IG profile pic as avatar (fallback: favicon → placeholder). Clickable lightbox. |
| Knowledge base (`/knowledge`) | Done | YouTube expert video transcripts analyzed and stored as markdown |
| **Find Competitors (`/competitors`)** | **Done** | **3-column advertiser grid. Each card: compact one-line header + 2-col thumbnail grid (aspect-[4/5], up to 4 ads). Visuals dominate cards. Keyword-based Meta Ad Library search in parallel batches of 3. Expandable ad grids with inline video playback. Progress UI: elapsed timer, per-batch estimates, smooth progress bar with heartbeat.** |
| **What's Working (`/analysis`)** | **Done** | **2-column hook grid. Hook thumbnails at natural aspect ratio (aspect-[3/4], 180px wide). Text truncated/folded ("More details" toggle). Deep hook analysis: per-ad hooks (exact text, technique, visual, psychology, effectiveness 1-10). Hooks displayed FIRST. 5-8 winning patterns. Clickable thumbnails, lightbox. Hook data flows into generation.** |
| **Create Ads (`/create`)** | **Done** | **2-column concept grid. Each concept: reference ad → gradient SVG arrow → generated ad (side by side, 4 images per row). Compact generation bar. Glass action buttons reveal copy/script/strategy in modal. QC runs silently (threshold 6.0, product-first prompts). Hook analysis injected into generation prompts.** |
| **4-step sidebar flow** | **Done** | **Brand Context → Find Competitors → What's Working → Create Ads + Knowledge Base. Step completion reads from JSON + CSV.** |
| **Unit tests** | **Done** | **33 tests via Vitest: competitor scoring (12), JSON storage (10), type contracts (11).** |
| Beginner tips (`/tips`) | Functional | Auto-generated from knowledge base. Not in sidebar, accessible via URL. |
| Pipeline (`/run`) | Legacy | Not in sidebar. Superseded by the 4-step flow. Still accessible via URL. |

## Data Storage

All runtime data lives in `data/`:

### JSON files (primary for new features)
- `data/brand-context.json` — brand identity, keywords, visual analysis, sources, collection metadata
- `data/search-results.json` — keywords used, scored advertisers, total ads scraped
- `data/analysis.json` — deep hook analysis (per-ad hooks[]), winning patterns[], summary, analysis metadata

### CSV files (tabular data)
- `data/brand.csv` — legacy single-row brand profile (kept for backward compatibility)
- `data/products.csv` — product catalog with image URLs
- `data/meta-ads.csv` — real ads scraped from Meta Ad Library (includes videoUrl)
- `data/concepts.csv` — generated ad concepts with QC fields (qualityScore, qualityFeedback, qcPassed)
- `data/knowledge.csv` — YouTube video analysis entries

### Asset directories
- `data/brand-assets/` — downloaded images prefixed by source (`web-`, `ig-`, `profile-pic.`, `favicon.`)
- `data/competitor-ads/` — downloaded competitor ad images organized by `{advertiser-slug}/`
- `data/knowledge/` — per-video markdown analysis files
- `data/generated-images/` — AI-generated ad visuals (aspect ratio matches reference)
- `data/archive/` — archived old Bloom brand data (brand CSV, products, competitors, concepts, assets, generated images)

## Measured Performance

| Operation | Time | Notes |
|-----------|------|-------|
| Status check | 20ms | JSON/CSV reads only |
| Brand context PUT | 49ms | JSON write + downstream clear |
| Keyword suggestion | 36ms | Extract from brand context |
| Search per batch (3 keywords) | ~10-30s | 3 parallel Apify scrapes + image download |
| Analysis (25 ads) | ~60-90s | Claude hook analysis + pattern identification (16K token output) |
| Concept batch (3 parallel) | ~120s | 3x (Claude + Kie.ai + QC) in parallel |
| Concept with QC retry | ~240s | Adds one retry cycle per failed concept |

## Technical Notes

- Brand context stored as JSON (`brand-context.json`) — the primary format. Legacy `brand.csv` is kept for backward compatibility.
- All APIs check `readBrandContext()` first, then `readBrand()` as fallback.
- Competitor discovery is 100% Meta Ad Library — no Perplexity, no Claude guessing.
- Apify actor parameter is `count` (NOT `max_ads` — returns 400 error). Over-request multiplier: 4x for ≤5 ads, 6x for ≤10, 8x for >10.
- Apify calls have 240s client-side abort timeout to prevent indefinite hanging.
- SSE heartbeat every 10s during Apify calls so the UI knows the connection is alive.
- Advertisers are scored and ranked by composite formula prioritizing longevity (days running = profitable).
- QC threshold is 6.0/10 — concepts below this get one retry with feedback. QC receives full product catalog. Product-first prompt structure.
- Image aspect ratio detected from downloaded reference ad image (PNG/JPEG/WebP header parsing, no external deps).
- Gemini vision analysis available via `analyzeImage()`, `analyzeVideoContent()`, `analyzeBrandVisuals()`.
- MetaAdCard supports video playback (play/pause/mute) and Ad Library links via `adId` prop.
- Brand change (POST /api/brand or PUT /api/brand-context) clears all downstream data: search-results.json, analysis.json, meta-ads.csv, concepts.csv, competitor-ads/, generated-images/.
- Keywords flow from brand context → competitor search page automatically (same keywords on both pages).
- Keyword search runs in parallel batches of 3. Concept generation runs in parallel batches of 3.
- Analysis prompt uses real Meta ad archive IDs (`[ID: xxx]` labels) so example thumbnails match actual downloaded ads.
- Analysis extracts deep per-ad hooks (HookAnalysis type): hookText, hookTechnique, hookVisual, whyItWorks, effectiveness, isVideo, videoFirstSeconds. Stored on AnalysisResult.hooks[].
- Hook data is passed to generateReplicaAdConcept() via batch route hookMap — injected as "HOOK ANALYSIS (CRITICAL)" section in the prompt.
- Video reference ads produce video concepts: `adType: "video"`, `videoScript` with scene-by-scene breakdown + key frame `imagePrompt`.
- Analysis page shows hooks FIRST (top 15 by effectiveness) in 2-column grid, then summary, then patterns. Hook thumbnails use `aspect-[3/4]` at 180px. Text truncated with "More details" toggle.
- MetaAdCard embedded mode (`showCopy={false}`): no Card wrapper, natural aspect ratio images with `max-h-[320px]`, `rounded-xl`.
- Create page: 2-column concept grid with gradient SVG arrow between reference and generated. Compact generation bar (single row), glass action buttons open modal (Copy / Script / Strategy).
- Competitors page: 3-column advertiser grid. Each card has compact one-line header and 2-column thumbnail grid at `aspect-[4/5]` showing up to 4 ads. Expanded cards span full width.
- Knowledge page: 2-column grid with w-44 thumbnails. Expanded entries span full width (`md:col-span-2`).
- Video play button overlays transparent by default, darken only on hover. No persistent dark overlays on images.
- Visual-first design philosophy: every page must show compelling visuals above the fold. Text is condensed (inline chips), truncated (line-clamp), or folded (collapsed sections). Visuals should dominate — a page full of images feels valuable, a page full of text feels like work.
