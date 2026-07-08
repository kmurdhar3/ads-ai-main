# Strategy

## Current Focus Period

Q2 2026 — Hybrid 4-stage redesign: making the tool genuinely white-label and data-driven.

## Strategic Priorities

1. **Data-driven competitor discovery** — Competitors are found through Meta Ad Library keyword search, not LLM guessing. Advertisers are scored by real signals (days running, ad count, creative diversity).
2. **Make it white-label ready** — Any user can use this with any brand. No hardcoded brand references. Brand context is flexible (URLs, keywords, files, descriptions).
3. **Quality control** — Every generated creative passes a QC gate before the user sees it. Brand consistency, copy quality, and strategic relevance are all scored.
4. **Polish and professionalism** — Every screen must look complete and trustworthy. Real product images, brand logos, favicons, profile pictures everywhere. No frozen progress, no silent failures, no broken media.

## What Success Looks Like

- A user can collect brand context via Claude Code or web form, and see it displayed on the web UI
- Keyword-based Meta Ad Library search returns scored advertisers ranked by real performance signals
- "What's Working" analysis identifies concrete patterns across competitor ads
- Batch generation dynamically pairs top competitor ads with products, with configurable counts
- QC gate catches low-quality output before the user sees it
- Generated images match the aspect ratio of the reference ad (vertical, square, or 4:5)

## Completed Steps

### Previous milestones
- Brand setup tab (`/brand`) — website crawling, Instagram scraping, product extraction, brand AI analysis, visual asset collection
- Knowledge base — YouTube expert videos scraped and analyzed
- 3-step wizard flow — sidebar with My Brand → Competitors → Create Ads

### Hybrid 4-Stage Redesign (2026-05-28)
- **4-step sidebar flow** — Brand Context → Find Competitors → What's Working → Create Ads with step completion indicators
- **Keyword-based competitor search** — Meta Ad Library search by keyword with advertiser scoring, replaces Perplexity + Claude guessing
- **"What's Working" analysis** — new Step 3 with pattern identification across competitor ads
- **Dynamic batch generation** — removed hardcoded ASSIGNMENTS, configurable concept count (1-30), product selector
- **Quality control gate** — evaluates each concept on brand consistency, copy quality, strategic relevance (7.0/10 threshold)
- **Brand context as JSON** — `brand-context.json` replaces CSV, web form and `/collect-brand` command both supported
- **Gemini vision analysis** — `analyzeImage()`, `analyzeVideoContent()`, `analyzeBrandVisuals()` for brand visual analysis
- **Brand-agnostic prompts** — removed all "Bloom" references from Claude prompts and UI
- **Removed Perplexity** — no more Perplexity API calls, competitor discovery is 100% Meta Ad Library
- **Removed `suggestCompetitors()`** — competitors found by keyword search, not LLM guessing
- **`/collect-brand` command** — agentic brand context collection via Claude Code
- **GETTING-STARTED.md** — user-facing setup guide
- **Unit tests** — 30 tests via Vitest covering scoring algorithm, JSON storage, type contracts
- **Archived Bloom data** — old brand data moved to `data/archive/`

### UX Polish (2026-05-28)
- **Apify parameter fix** — changed `max_ads` to `count` (the correct Apify actor parameter). Reduced search from 300s timeout to ~12s per keyword.
- **Search progress UX** — elapsed timer, per-keyword time estimates, smooth cumulative progress bar (no more resetting), heartbeat SSE events every 10s
- **Video playback in MetaAdCard** — play button overlay on video ad thumbnails, click-to-pause on playing video, mute/unmute toggle, "Video" badge
- **Ad Library links** — every ad card links to `facebook.com/ads/library/?id=...` via ad ID
- **Aspect ratio detection** — reads downloaded image dimensions (PNG/JPEG/WebP header parsing) to match generated image format to reference ad (9:16, 4:5, or 1:1)
- **Brand avatar fix** — IG profile pic (circle) prioritized over logo/favicon. Favicon used as fallback (centered, `object-contain`). Logo never used as avatar (crops badly).
- **Collapsible Products & Visuals** — chevron toggle headers, sections expand/collapse
- **Image lightbox** — click any product image or visual asset to open full-screen with dark overlay, X close, click-outside-to-close
- **Error messages shown** — Apify errors now include the actual error text, not just "Failed"
- **Create page race condition fix** — all initial fetches use `Promise.all()` so data loads atomically

### Flow & Generation Polish (2026-05-28)
- **Brand change clears downstream** — changing brand via `/api/brand` POST or `/api/brand-context` PUT clears search-results.json, analysis.json, meta-ads.csv, concepts.csv, competitor-ads/, generated-images/. Steps 2-4 reset in sidebar.
- **Keywords flow Step 1 → Step 2** — brand context keywords auto-populate in Find Competitors. Same keywords on both pages.
- **Parallel keyword search** — keywords now scraped in batches of 3 in parallel (~3x faster for 6+ keywords)
- **Analysis thumbnails + video lightbox** — What's Working page shows clickable ad thumbnails next to every example. Video ads open in a video player lightbox. Static ads open full-size. "Source" links to Meta Ad Library.
- **Analysis real ad IDs** — prompt labels ads with `[ID: actual_id]` so Claude uses real Meta archive IDs in examples. All thumbnails now match.
- **Video concept generation** — reference video ads produce video concepts: scene-by-scene script (visuals, voiceover, on-screen text, music, duration) + key frame image. `adType` field ("video"|"static") on AdConcept. UI shows Video/Static badges and Video Script section.
- **Parallel concept generation** — batch size increased from 2 to 3. Progress shows per-batch message instead of per-concept (no more "skipping to 2").
- **Create page time estimates** — elapsed timer, estimated total time, percentage, explanation text ("Generating 3 concepts in parallel — each batch takes ~2 min")

### Create Ads Redesign (2026-05-29)
- **Content-first layout** — removed AI Context Summary card and verbose generation card. Replaced with compact generation bar (count input + generate button + product toggles in one row).
- **Clean card design** — concept cards use `glass rounded-2xl` with side-by-side images at natural aspect ratio (no forced 4:3 cropping). Images capped at `max-h-[320px]` so even 9:16 vertical fits on a 14" MacBook.
- **Glass action buttons** — "Ad Copy", "Video Script", "Strategy" buttons below images. Details hidden by default, revealed in a glass-morphism Dialog modal with tabbed sections (inspired by social-media repo pattern).
- **MetaAdCard embedded mode** — `showCopy={false}` renders without Card wrapper, no text section. Clean image-only display with `rounded-xl` corners.
- **Ad Library link** in label row — moved from overlaid button on image to elegant inline label: "Reference · 127d · Ad Library ↗". Image stays pristine.
- **No video overlay darkening** — play button overlay is transparent by default, darkens only on hover. Both sides of comparison have equal brightness.
- **QC root cause fixes** — product-first prompt structure prevents Claude from writing about competitor's product instead of assigned product. QC evaluator receives full product catalog (prevents false "wrong category" failures). Threshold recalibrated from 7.0 to 6.0.
- **QC invisible to users** — removed QC score badges, warning banners, and "Show Passed Only" toggle. Failed concepts never shown.

### Deep Hook Analysis (2026-05-29)
- **HookAnalysis type** — `adId`, `hookText`, `hookTechnique`, `hookVisual`, `whyItWorks`, `effectiveness` (1-10), `isVideo`, `videoFirstSeconds`. Stored on `AnalysisResult.hooks[]`.
- **Per-ad hook extraction** — `analyzeWinningPatterns()` now extracts deep hooks for top 25 ads: exact opening text, specific technique name, visual composition, psychological mechanism, effectiveness rating. Video ads get `videoFirstSeconds` describing the first 3-5 seconds.
- **Hooks displayed FIRST** — analysis page shows "Top Hooks" section before patterns and summary. Each hook card: thumbnail (clickable), hook text in bold, technique badge, Video/Static badge, days running, advertiser, Ad Library link, "Why it works" explanation. Video hooks show "First 3-5 seconds" detail in blue panel.
- **Pattern hookAnalysis** — each winning pattern includes a dedicated paragraph analyzing the hook strategies used in that pattern.
- **Hook data flows into generation** — `generateReplicaAdConcept()` receives the reference ad's specific `HookAnalysis` and injects it into the prompt: technique, exact text, visual, psychology, with instruction to replicate the same mechanism.
- **Batch route wiring** — builds `adId → HookAnalysis` map from analysis, passes to each concept generation call.
- **Unit tests** — 33 total (30 original + 3 new hook type contract tests).
- **Validated on real data** — 24 hooks extracted (15 video with firstSeconds, 9 static), 8 patterns with hookAnalysis, all with rich specific data.

### Visual-First Page Redesign (2026-05-31)
- **Brand page**: Visuals gallery moved above the fold (always expanded, no toggle). Brand description collapsed to 2 lines with "Show more". Colors/Style/Category as inline chips instead of 3 cards. Visual Analysis, Keywords, Sources grouped under collapsible "Details" (collapsed by default). Products expanded by default.
- **Competitors page**: 3-column grid (`xl:grid-cols-3`) for advertiser cards. Each card has a compact one-line header (rank + name + badges + chevron) and a 2-column thumbnail grid at `aspect-[4/5]` showing up to 4 ads — visuals dominate the card. Expanded cards span full width. Video ads show play icon overlay.
- **Analysis page**: 2-column grid (`lg:grid-cols-2`) for hook cards. Hook thumbnails at natural aspect ratio (`aspect-[3/4]`, 180px wide, up from 140px square). "Why it works" truncated to 2 lines. "Visual" and "First 3-5 seconds" folded behind "More details" toggle. Pattern example thumbnails increased from w-14 to w-20.
- **Create page**: 2-column concept grid (`lg:grid-cols-2`). Each concept shows reference ad (left) → gradient SVG arrow → generated ad (right) side by side. Four images visible per row. Action button labels shortened for narrower cards.
- **Knowledge page**: 2-column grid (`md:grid-cols-2`). Thumbnails 10% larger (w-44). Expanded entries span full width (`md:col-span-2`).

## Next Steps

- **Two-phase competitor discovery** — keyword search finds advertisers, then page-level scrape gets their best ads sorted by impressions. Much higher quality than keyword-only search.
- Multi-brand support (switch between saved brand contexts)
- Improve keyword search quality (test broad vs. narrow keyword strategies)
