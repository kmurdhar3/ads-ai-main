# Plan: Hybrid Redesign — 4-Stage Ad Creation Flow

**Created:** 2026-05-28
**Status:** Implemented
**Request:** Redesign into a hybrid architecture (Claude Code chat + web UI) with 4 stages: Collect Context, Find Competitors, Analyze What's Working, Generate Concepts. Remove Perplexity, remove Claude guessing, remove hardcoded assignments. Make everything dynamic and brand-agnostic.

---

## Overview

### What This Plan Accomplishes

Transforms the app from a rigid 3-step web form workflow (tied to one brand) into a hybrid system where: (1) brand context is collected agentically via Claude Code chat (user provides whatever they have — URLs, files, keywords), and (2) a web UI visualizes all results across 4 clear stages with the ability to edit/redo any step. Competitor discovery is based entirely on Meta Ad Library data, scored by real spending signals, not LLM guesses.

### Why This Matters

The current system only works for one brand (Bloom) due to hardcoded ad-to-product assignments, relies on Claude guessing competitors (unreliable), uses Perplexity for vague strategy summaries (not grounded in data), and doesn't analyze brand visuals. This redesign makes the tool genuinely white-label — any person can use it for any brand in any niche — while grounding every decision in real Meta Ad Library data.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `app/src/lib/types.ts` | All data types — `Brand`, `Product`, `CompetitorAd`, `MetaAdEntry`, `AdConcept` |
| `app/src/lib/csv.ts` | CSV-based storage for all data (brand, products, competitors, meta-ads, concepts) |
| `app/src/lib/claude.ts` | `suggestCompetitors()`, `generateReplicaAdConcept()`, `analyzeBrandIdentity()`, `extractProductsWithClaude()` |
| `app/src/lib/apify.ts` | Instagram scraping, Meta Ad Library scraping (`scrapeMetaAds()`, `downloadAdImage()`) |
| `app/src/lib/firecrawl.ts` | Website crawling, brand extraction, product extraction, asset downloading |
| `app/src/lib/gemini.ts` | Video upload/analysis — exists but NOT used for brand image analysis |
| `app/src/lib/kie-ai.ts` | Image generation via Kie.ai — stays as-is |
| `app/src/lib/pipeline.ts` | Legacy pipeline with Perplexity `researchCompetitor()` |
| `app/src/app/api/brand/route.ts` | Brand scraping API (POST with SSE) |
| `app/src/app/api/competitors/route.ts` | Competitor suggestion + Perplexity research + Meta scraping |
| `app/src/app/api/create/batch/route.ts` | Hardcoded 20-assignment batch generation |
| `app/src/app/api/status/route.ts` | Step completion check |
| `app/src/app/brand/page.tsx` | Brand setup form UI |
| `app/src/app/competitors/page.tsx` | Competitor research UI |
| `app/src/app/create/page.tsx` | Ad concept generation UI (side-by-side) |
| `app/src/components/app-sidebar.tsx` | 3-step sidebar with completion indicators |
| `data/brand.csv` | Single-row brand profile (CSV) |
| `data/products.csv` | Product catalog |
| `data/competitors.csv` | Perplexity strategy analyses |
| `data/meta-ads.csv` | Scraped Meta Ad Library ads |
| `data/concepts.csv` | Generated ad concepts |

### Gaps or Problems Being Addressed

1. **Brand input is rigid** — only accepts URL + Instagram handle via web form. No support for keywords, files, or agentic flexibility.
2. **No visual analysis** — Instagram images and website images are downloaded but never analyzed. Gemini exists but isn't used for brand images or videos.
9. **No quality control** — generated creatives go straight to the UI with no check for brand consistency, visual quality, or coherence. Bad outputs show up alongside good ones.
10. **Fixed batch sizes** — everything runs at full scale (20 concepts, 6 competitors, all products). No way to test with small subsets first, which wastes time and API credits during development/validation.
3. **Competitor discovery is guesswork** — `suggestCompetitors()` is pure Claude LLM guessing with zero data backing.
4. **Perplexity adds little value** — writes vague strategy narratives not grounded in actual ad data. The Meta Ad Library scraping is the real value.
5. **Hardcoded assignments** — `ASSIGNMENTS` array in `batch/route.ts` maps specific Meta ad IDs to specific Bloom product names. Completely breaks for any other brand.
6. **No "what's working" analysis** — competitor finding and analysis are merged. No step identifies patterns across proven winners.
7. **Brand profile in CSV** — awkward for a single object with nested/complex fields. JSON is more natural.
8. **Brand-specific references** — several places say "Bloom" explicitly (in prompts, in `generateReplicaAdConcept`, in the Create page UI).

---

## Proposed Changes

### Summary of Changes

- **New data model**: Brand context stored as JSON (`data/brand-context.json`), products stay CSV, add `data/search-results.json` for keyword search state, add `data/analysis.json` for "what's working" analysis
- **New Step 1**: Remove brand web form. Brand context is collected via Claude Code chat. Add a Claude Code command `/collect-brand` with instructions. Web UI becomes read-only visualization of collected context. Add Gemini vision analysis for brand images AND videos (using `gemini-3.5-flash`).
- **New Step 2**: Remove Perplexity and `suggestCompetitors()`. New keyword-based Meta Ad Library search: extract keywords from brand context, scrape ads, group by advertiser, score (days running, ad count, creative diversity), rank. Web UI shows keywords used, results, and lets user add/edit keywords for re-search.
- **New Step 3**: New "What's Working" analysis page. Claude analyzes all scraped competitor ads and identifies patterns — winning hooks, copy structures, visual approaches, offers, emotional angles. Produces a structured analysis users can review.
- **New Step 4**: Dynamic concept generation. No hardcoded assignments. Automatically pairs top-performing competitor ads with user's products. Replaces brand-specific prompts with generic ones. **Quality control gate**: after generation, each creative is evaluated by Claude for brand consistency, visual quality, and coherence. Only creatives that pass QC are shown to the user. Failed creatives are regenerated or flagged.
- **Configurable batch sizes on every step**: Each step accepts a count/limit parameter. Users can test with 1 product, 1 competitor, 1 creative, then scale up when satisfied. Web UI exposes these controls.
- **Sidebar update**: 4 steps instead of 3. New labels and icons.
- **Remove**: Perplexity integration, `suggestCompetitors()`, `CompetitorAd` type, `competitors.csv`, `researchCompetitor()`, hardcoded `ASSIGNMENTS`, "Bloom" references in prompts.
- **Keep**: MetaAdCard, image proxy, Kie.ai, FireCrawl, Apify Meta scraper, SSE streaming, dark glass-morphism UI.

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/src/app/api/brand-context/route.ts` | GET/PUT for brand context JSON (replaces CSV brand storage) |
| `app/src/app/api/search/route.ts` | POST: keyword search via Meta Ad Library with scoring. GET: current search state/results |
| `app/src/app/api/analysis/route.ts` | POST: generate "what's working" analysis via Claude. GET: retrieve existing analysis |
| `app/src/app/analysis/page.tsx` | "What's Working" analysis page UI (Step 3) |
| `app/src/lib/competitor-scoring.ts` | Advertiser scoring algorithm: group ads by advertiser, score by days-running/ad-count/diversity, rank |
| `data/brand-context.json` | Brand context document (replaces `brand.csv`). Structured JSON with brand identity, products, visual analysis, raw sources |
| `data/search-results.json` | Search state: keywords used, raw results, scored advertisers, selected competitors |
| `data/analysis.json` | "What's Working" analysis output — patterns, winning strategies, recommendations |
| `app/src/lib/quality-control.ts` | QC module: evaluates generated creatives against brand context for consistency, quality, and coherence. Scores each creative and flags/rejects low-quality ones. |
| `.claude/commands/collect-brand.md` | Claude Code command for agentic brand context collection |
| `GETTING-STARTED.md` | User-facing guide: what this tool does, prerequisites, setup, and a step-by-step walkthrough of the full 4-stage flow. The entry point for any new user. |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `app/src/lib/types.ts` | Remove `CompetitorAd`, `PipelineConfig`, `PipelineProgress`. Add `BrandContext`, `SearchState`, `ScoredAdvertiser`, `WinningPattern`, `AnalysisResult`. Update `AdConcept` to remove Bloom-specific fields. |
| `app/src/lib/csv.ts` | Remove `readBrand/writeBrand`, `readCompetitors/writeCompetitors` and their column definitions. Add JSON read/write helpers for brand context, search state, and analysis. Keep `readProducts/writeProducts`, `readMetaAds/writeMetaAds`, `readConcepts/writeConcepts`, knowledge/sources. |
| `app/src/lib/claude.ts` | Remove `suggestCompetitors()`. Remove Bloom-specific language from `generateReplicaAdConcept()` — make it brand-agnostic. Add `analyzeWinningPatterns()` function for Step 3. Update `analyzeBrandIdentity()` to work with JSON output. |
| `app/src/lib/apify.ts` | Update `scrapeMetaAds()` to return more metadata needed for scoring (keep existing filter pipeline). No structural changes needed — the function already works by keyword. |
| `app/src/lib/gemini.ts` | Upgrade model from `gemini-2.5-flash` to `gemini-3.5-flash`. Add `analyzeImage()` for brand image analysis and `analyzeVideoContent()` for brand video analysis (Instagram reels, product videos). Both use Gemini vision to extract visual style, colors, composition, mood, content descriptions. |
| `app/src/app/api/competitors/route.ts` | Major rewrite. Remove Perplexity integration entirely. Keep Meta Ad Library scraping. Rename to search-oriented flow. (Or replace with new `api/search/route.ts` and delete this file.) |
| `app/src/app/api/create/batch/route.ts` | Remove hardcoded `ASSIGNMENTS`. Add dynamic pairing algorithm: select top ads by score, pair with brand products by relevance, generate concepts. |
| `app/src/app/api/status/route.ts` | Update to check 4 steps instead of 3. Check brand-context.json, search-results.json, analysis.json, concepts.csv. |
| `app/src/app/brand/page.tsx` | Simplify to read-only brand context viewer. Remove scraping form. Show collected context: brand identity, products, visual analysis, source materials. Add "Collect via Claude Code" instructions. |
| `app/src/app/competitors/page.tsx` | Rename to search/discovery page. Show keywords used, allow adding/editing keywords. Display scored advertiser rankings. Show scraped ads per advertiser. Button to re-search with different keywords. |
| `app/src/app/create/page.tsx` | Remove "Bloom" references. Replace hardcoded "20 concepts" with dynamic count. Use brand name from context. Keep side-by-side layout. |
| `app/src/components/app-sidebar.tsx` | 4 steps: "Brand Context" → "Find Competitors" → "What's Working" → "Create Ads". Remove "Powered by Claude + Perplexity" footer. |
| `app/src/lib/pipeline.ts` | Remove `researchCompetitor()` (Perplexity). Simplify or remove — most of its functionality moves to dedicated API routes. |
| `CLAUDE.md` | Update to reflect new 4-stage architecture, hybrid model, removed dependencies, new commands. |
| `context/strategy.md` | Update completed steps and next steps. |
| `context/current-data.md` | Update app state table. |

### Files to Delete

| File Path | Reason |
|-----------|--------|
| `data/competitors.csv` | Replaced by `search-results.json`. Perplexity strategy data is no longer collected. |
| `data/brand.csv` | Replaced by `data/brand-context.json`. |

---

## Design Decisions

### Key Decisions Made

1. **Brand context collected via Claude Code chat, not web form**: The user described wanting an agentic approach — "give whatever is at hand." A web form with fixed fields can't handle the variety of inputs (URLs, files, keywords, Instagram handles, PDFs). Claude Code can adaptively process any input using FireCrawl, Apify, file parsing, and Gemini vision. The web UI becomes a read-only viewer of the collected context.

2. **JSON for brand context instead of CSV**: Brand context is a single, complex, nested document — not tabular data. JSON is the natural format. Products stay in CSV because they're tabular (multiple rows, fixed columns).

3. **Meta Ad Library is the ONLY competitor discovery source**: The user was explicit — no Claude guessing, no Perplexity. Competitors are discovered by searching the Meta Ad Library by keyword, then scoring advertisers by real signals. This is more reliable and data-driven.

4. **Scoring algorithm based on days-running as primary signal**: An ad running 60+ days is almost certainly profitable — advertisers don't pay for losing ads. Secondary signals: total active ad count (budget size), creative diversity (testing sophistication). This creates a quantified ranking, not subjective guesswork.

5. **Explicit "What's Working" step before generation**: Currently analysis and generation are merged. Separating them gives users visibility into what patterns were identified and lets them influence which patterns to emphasize before generating concepts.

6. **Dynamic ad-to-product pairing instead of hardcoded table**: Pair top-scoring ads with brand products based on relevance (product category, ad topic, visual similarity). If no products exist (keyword-only brand), generate generic brand concepts.

7. **Keep existing Perplexity env var but remove usage**: Don't require users to delete the env var, just stop calling the API. The `PERPLEXITY_AI_API_KEY` can remain in `.env` without harm.

8. **Gemini for brand visual analysis**: The user specifically mentioned wanting to analyze images and videos. Gemini has strong vision capabilities and is already integrated (API key exists, upload/analysis functions exist in `gemini.ts`). Just need to add image analysis alongside the existing video analysis.

### Alternatives Considered

1. **Keep Perplexity as optional enrichment**: Rejected — the user explicitly said "only Meta Ad Library." Perplexity adds noise and cost without grounded data.

2. **Use Claude vision instead of Gemini for image analysis**: Claude has vision capabilities, but Gemini is already set up with API key and the user specifically mentioned Gemini for this purpose. Gemini is also cheaper for bulk image analysis.

3. **Keep brand input as web form with more options**: Rejected — the user wants agentic flexibility. A form with 10 input types is worse UX than just telling Claude "here's my stuff, figure it out."

4. **Build a custom chat UI inside the web app for Step 1**: Too complex for this phase. Claude Code chat already exists and works. The web app can show results without needing its own chat interface.

### Open Questions

1. **Keyword selection strategy**: Should the system try both broad and narrow keywords automatically (e.g., "supplements" + "greens powder" + "superfood blend"), or start with narrow keywords derived from products and let the user broaden? (User leans toward showing keywords and letting them edit — implemented in the UI.)

2. **Search results persistence across keyword searches**: When the user searches a new keyword, should old results be replaced or accumulated? Accumulation builds a richer competitor landscape but may include irrelevant advertisers from early broad searches.

3. **QC threshold tuning**: Starting at 7.0/10 as the pass threshold. May need adjustment after seeing real results — too strict wastes API credits on retries, too lenient lets garbage through. Should be configurable in the UI or environment.

---

## Step-by-Step Tasks

### Step 1: Update Data Types and Storage Layer

Remove old types, add new ones, and switch brand storage from CSV to JSON.

**Actions:**

- In `types.ts`:
  - Remove `CompetitorAd` interface (the Perplexity strategy type)
  - Remove `PipelineConfig` and `PipelineProgress` (legacy pipeline)
  - Add `BrandContext` interface:
    ```typescript
    export interface BrandContext {
      // Core identity
      name: string;
      url?: string;
      description: string;
      tagline?: string;
      category: string; // e.g., "supplements", "charging accessories"
      keywords: string[]; // search terms derived from brand context
      
      // Visual identity
      colors?: string;
      style?: string;
      visualAnalysis?: string; // Gemini vision analysis of brand imagery
      
      // Social presence
      instagramHandle?: string;
      instagramFollowers?: number;
      instagramProfilePicUrl?: string;
      
      // Assets
      logoUrl?: string;
      faviconUrl?: string;
      
      // Sources used to build this context
      sources: { type: string; url?: string; description: string }[];
      
      // Metadata
      collectedAt: string;
      collectedBy: "claude-code" | "web-form";
    }
    ```
  - Add `ScoredAdvertiser` interface:
    ```typescript
    export interface ScoredAdvertiser {
      name: string;
      totalAds: number;
      activeAds: number;
      maxDaysRunning: number;
      avgDaysRunning: number;
      creativeDiversity: number; // unique creatives count
      score: number; // composite score
      adIds: string[]; // references to MetaAdEntry ids
    }
    ```
  - Add `SearchState` interface:
    ```typescript
    export interface SearchState {
      keywords: string[];
      searchedAt: string;
      advertisers: ScoredAdvertiser[];
      totalAdsScraped: number;
    }
    ```
  - Add `AnalysisResult` interface:
    ```typescript
    export interface AnalysisResult {
      patterns: WinningPattern[];
      summary: string;
      analyzedAt: string;
      totalAdsAnalyzed: number;
    }
    
    export interface WinningPattern {
      name: string; // e.g., "Question Hook + Social Proof"
      frequency: number; // how many ads use this pattern
      avgDaysRunning: number; // average longevity of ads using this pattern
      description: string;
      examples: { advertiser: string; adId: string; excerpt: string }[];
      hookType: string;
      copyStructure: string;
      emotionalAngle: string;
      offerType: string;
      visualApproach: string;
    }
    ```
  - Add `QualityScore` interface for creative QC:
    ```typescript
    export interface QualityScore {
      conceptId: string;
      brandConsistency: number;  // 1-10: colors, tone, style match brand context
      copyQuality: number;       // 1-10: grammar, persuasiveness, hook strength
      visualRelevance: number;   // 1-10: image prompt matches brand + competitor strategy
      overallScore: number;      // weighted average
      passed: boolean;           // true if overallScore >= threshold (default 7)
      feedback: string;          // why it passed/failed, what's weak
      evaluatedAt: string;
    }
    ```
  - Update `AdConcept` to include QC fields:
    - Add `qualityScore?: number` — overall QC score
    - Add `qualityFeedback?: string` — QC evaluation notes
    - Add `qcPassed?: boolean` — whether it cleared the quality gate

- In `csv.ts`:
  - Remove `readBrand/writeBrand` and `brandColumns`
  - Remove `readCompetitors/writeCompetitors` and `competitorColumns`
  - Add JSON read/write helpers:
    ```typescript
    export function readJson<T>(filename: string): T | null
    export function writeJson<T>(filename: string, data: T): Promise<void>
    ```
  - Add specific accessors:
    ```typescript
    export function readBrandContext(): BrandContext | null
    export function writeBrandContext(ctx: BrandContext): Promise<void>
    export function readSearchState(): SearchState | null
    export function writeSearchState(state: SearchState): Promise<void>
    export function readAnalysis(): AnalysisResult | null
    export function writeAnalysis(analysis: AnalysisResult): Promise<void>
    ```

**Files affected:**
- `app/src/lib/types.ts`
- `app/src/lib/csv.ts`

---

### Step 2: Add Gemini Image + Video Analysis

Add the ability to analyze brand images AND videos with Gemini `gemini-3.5-flash` vision.

**Actions:**

- **Upgrade model**: Replace all `gemini-2.5-flash` references in `gemini.ts` with `gemini-3.5-flash`.

- In `gemini.ts`, add `analyzeImage()` function:
  ```typescript
  export async function analyzeImage(imagePath: string, prompt: string): Promise<string>
  ```
  - Read image file from disk
  - Send to Gemini as inline image data (base64) with the prompt
  - Return analysis text

- Add `analyzeVideoContent()` function:
  ```typescript
  export async function analyzeVideoContent(videoPath: string, prompt: string): Promise<string>
  ```
  - Upload video to Gemini (reuse existing `uploadVideo()` + `waitForFile()` pattern)
  - Analyze with a prompt focused on: what products/services are shown, visual style, messaging, hooks used, production quality, brand voice
  - Return analysis text

- Add `analyzeBrandVisuals()` function that takes arrays of image paths AND video paths:
  ```typescript
  export async function analyzeBrandVisuals(
    imagePaths: string[],
    videoPaths: string[],
    options?: { maxImages?: number; maxVideos?: number }
  ): Promise<string>
  ```
  - Runs `analyzeImage()` on a sample of images (default 5-8)
  - Runs `analyzeVideoContent()` on a sample of videos (default 2-3, videos are expensive)
  - Synthesizes all individual analyses into a unified visual style description via one final Claude/Gemini call

- The prompt for brand visual analysis should cover:
  - Color palette (dominant and accent colors)
  - Photography style (lifestyle, product, flat-lay, UGC, studio)
  - Composition patterns
  - Typography if visible
  - Overall aesthetic/mood
  - Brand consistency across images and videos
  - Video-specific: pacing, transitions, talking heads vs. product demos, music/sound style

**Files affected:**
- `app/src/lib/gemini.ts`

---

### Step 3: Build Competitor Scoring Algorithm

Create the scoring module that groups ads by advertiser and ranks them.

**Actions:**

- Create `app/src/lib/competitor-scoring.ts`:
  - `scoreAdvertisers(ads: MetaAdEntry[]): ScoredAdvertiser[]`
    - Group all ads by `advertiser` name
    - For each advertiser calculate:
      - `totalAds`: count of all ads
      - `activeAds`: count of ads where `isActive === true`
      - `maxDaysRunning`: longest-running ad (strongest signal)
      - `avgDaysRunning`: average across all ads
      - `creativeDiversity`: count of unique creatives (deduplicated by primaryText first 100 chars)
    - Calculate composite `score`:
      ```
      score = (maxDaysRunning * 3) + (avgDaysRunning * 2) + (totalAds * 10) + (creativeDiversity * 5)
      ```
      Weights prioritize longevity (proven profitability) over volume.
    - Sort descending by score
    - Return array with ad IDs linked

- `extractKeywords(brandContext: BrandContext): string[]`
  - From brand context, extract meaningful search keywords
  - Use product names, categories, brand description keywords
  - Return mix of narrow (product-specific) and broad (category-level) terms
  - Example: brand sells "protein powder" and "greens blend" → keywords: `["protein powder", "greens supplement", "superfood blend", "fitness supplement"]`

**Files affected:**
- `app/src/lib/competitor-scoring.ts` (new)

---

### Step 4: Build Search API Route

Replace the competitor discovery flow with keyword-based Meta Ad Library search.

**Actions:**

- Create `app/src/app/api/search/route.ts`:

  - **GET**: Return current `SearchState` from `data/search-results.json`

  - **POST** with `action: "search"`:
    - Accept `{ keywords: string[], adsPerKeyword?: number }` in body
    - `adsPerKeyword` defaults to 15 but can be set to any number (e.g., 3 for quick testing, 30 for thorough search)
    - For each keyword, call `scrapeMetaAds(keyword, { limit: adsPerKeyword })` with SSE progress streaming
    - Download ad images for all results
    - Save all ads to `meta-ads.csv` (replace, not append — each search is a fresh state)
    - Run `scoreAdvertisers()` on all scraped ads
    - Save `SearchState` to `data/search-results.json`
    - SSE events:
      - `{ phase: "searching", keyword, index, total, message }`
      - `{ phase: "keyword-done", keyword, adsFound, message }`
      - `{ phase: "scoring", message }`
      - `{ phase: "done", totalAds, advertisers: count, topAdvertiser, message }`

  - **POST** with `action: "suggest-keywords"`:
    - Read brand context
    - Call `extractKeywords()` from scoring module
    - Return `{ keywords: string[] }`

- Add 1-second delay between keyword searches to avoid rate limiting on Apify.

**Files affected:**
- `app/src/app/api/search/route.ts` (new)

---

### Step 5: Build Analysis API Route

Create the "What's Working" analysis endpoint.

**Actions:**

- In `claude.ts`, add `analyzeWinningPatterns()`:
  - Takes all `MetaAdEntry[]` (sorted by daysRunning desc)
  - Takes brand context for relevance filtering
  - Sends top 30-40 ads to Claude with a prompt that asks it to identify patterns:
    - Hook types that appear repeatedly in long-running ads
    - Copy structures that correlate with longevity
    - Visual approaches (text-on-image, UGC, lifestyle, product-only)
    - Offer types (discount, free trial, bundle, BOGO)
    - Emotional angles (FOMO, aspiration, trust, social proof)
    - CTA patterns
  - Returns structured `AnalysisResult` with identified patterns and examples

- Create `app/src/app/api/analysis/route.ts`:
  - **GET**: Return existing analysis from `data/analysis.json`
  - **POST**: Read meta-ads and brand context, run `analyzeWinningPatterns()`, save result, return it

**Files affected:**
- `app/src/lib/claude.ts`
- `app/src/app/api/analysis/route.ts` (new)

---

### Step 6: Rewrite Batch Generation (Remove Hardcoded Assignments) + Quality Control

Replace the hardcoded assignment table with dynamic pairing, configurable count, and a QC gate.

**Actions:**

- In `batch/route.ts`:
  - Remove the `ASSIGNMENTS` constant entirely
  - Accept `{ count?: number, productNames?: string[] }` in POST body:
    - `count` — how many concepts to generate (default 10, min 1, max 30). Start with 1 for testing.
    - `productNames` — optional subset of products to use. If omitted, use all products. If provided, only pair ads with these specific products.
  - New flow:
    1. Read brand context, products (filtered by `productNames` if provided), meta-ads, search state, and analysis
    2. Get top ads: sort meta-ads by `daysRunning` desc, take enough to fill `count` pairings
    3. Dynamic pairing algorithm:
       - If products exist: distribute top ads across selected products. Each product gets `ceil(count / products.length)` concepts.
       - If no products (keyword-only brand): pair top `count` ads with generic brand concepts
    4. For each pairing, call `generateReplicaAdConcept()` with brand context (not hardcoded Bloom)
    5. **Quality control gate** (see Step 6b below): after generating each concept + image, evaluate it before streaming to the user
    6. Keep the existing parallel execution (2 at a time) and SSE streaming
    7. SSE events now include QC status: `{ type: "concept", index, concept, qcPassed, qcScore, qcFeedback }`
    8. If a concept fails QC (score < 7): attempt ONE regeneration with the QC feedback injected into the prompt. If it fails again, include it in results but mark it as `qcPassed: false` with the feedback visible.

- In `claude.ts`, update `generateReplicaAdConcept()`:
  - Replace all "Bloom" references with dynamic brand name from context
  - Replace "Create a Bloom ad" → "Create a {brand.name} ad"
  - Replace "Your Bloom Version" → "Your {brand.name} Version"
  - The function signature stays the same — it already takes `brand` and `product` as parameters
  - Accept optional `previousFeedback?: string` parameter for QC retry — if provided, prepend it to the prompt: "A previous version was rejected because: {feedback}. Fix these issues."

- Add `pairAdsWithProducts()` function (could be in `claude.ts` or a new utility):
  - Takes top ads + selected products + desired count
  - Uses a simple heuristic or Claude call to create relevant pairings
  - Returns `{ ad: MetaAdEntry, product: Product | null }[]`

**Files affected:**
- `app/src/app/api/create/batch/route.ts`
- `app/src/lib/claude.ts`

---

### Step 6b: Build Quality Control Module

Create the QC evaluation that checks each generated creative before showing it to the user.

**Actions:**

- Create `app/src/lib/quality-control.ts`:

  - `evaluateCreative(concept: AdConcept, brandContext: BrandContext, referenceAd: MetaAdEntry): Promise<QualityScore>`
    - Sends the generated concept (copy + image prompt) and brand context to Claude
    - Claude evaluates on 3 dimensions (each scored 1-10):
      1. **Brand consistency** (weight 40%): Does the tone match the brand voice? Do the colors/style references match brand context? Is the product represented accurately?
      2. **Copy quality** (weight 35%): Is the hook compelling? Is the copy grammatically correct and persuasive? Does the CTA make sense? Is it professional, not generic filler?
      3. **Strategic relevance** (weight 25%): Does it actually replicate the competitor ad's winning strategy? Is the adaptation smart, not just a find-and-replace of the brand name?
    - Overall score = weighted average. Threshold for passing: 7.0
    - Returns `QualityScore` with scores, pass/fail boolean, and specific feedback on what's weak

  - `evaluateGeneratedImage(imagePath: string, brandContext: BrandContext, imagePrompt: string): Promise<{ score: number; feedback: string }>`
    - Uses Gemini vision (`gemini-3.5-flash`) to analyze the generated image
    - Checks: Does it match the image prompt? Does it look professional? Are text overlays readable and correctly spelled? Does it match brand colors?
    - Returns a score (1-10) and feedback
    - This runs AFTER the Kie.ai image is generated and downloaded

  - The batch route calls `evaluateCreative()` on each concept right after generation. If the image is also generated, it additionally calls `evaluateGeneratedImage()`. The combined score determines pass/fail.

- The QC evaluation prompt should be strict but fair:
  - Score 1-3: Garbage — wrong brand, nonsensical copy, completely off-strategy
  - Score 4-6: Mediocre — technically correct but generic, weak hook, doesn't match brand voice
  - Score 7-8: Good — on-brand, compelling, properly adapts the competitor strategy
  - Score 9-10: Excellent — could run as-is, strong hook, perfect brand match

**Files affected:**
- `app/src/lib/quality-control.ts` (new)
- `app/src/app/api/create/batch/route.ts` (calls QC after generation)

---

### Step 7: Create Brand Context API Route

Replace the brand CSV API with a JSON-based context API.

**Actions:**

- Create `app/src/app/api/brand-context/route.ts`:
  - **GET**: Read and return `brand-context.json`. Also return product list from `products.csv` and brand asset filenames from `data/brand-assets/`.
  - **PUT**: Accept a `BrandContext` object and write it to `brand-context.json`. This is how Claude Code (or a future web form) saves collected brand context.

- Update `app/src/app/api/brand/route.ts`:
  - Keep the POST endpoint for web-based scraping (backward compatibility), but have it write to `brand-context.json` instead of `brand.csv`
  - Update GET to read from `brand-context.json`

**Files affected:**
- `app/src/app/api/brand-context/route.ts` (new)
- `app/src/app/api/brand/route.ts`

---

### Step 8: Create Claude Code `/collect-brand` Command

Create instructions for agentic brand context collection.

**Actions:**

- Create `.claude/commands/collect-brand.md`:
  - Purpose: Guide Claude Code through collecting brand context from whatever the user provides
  - Steps:
    1. Ask user what they have (URLs, files, Instagram, keywords, product descriptions)
    2. For URLs: use FireCrawl to crawl and extract (via the existing `/api/brand` POST endpoint, or directly via `firecrawl.ts` patterns)
    3. For Instagram: use Apify scraper
    4. For files: read and parse them
    5. For keywords/descriptions: use as-is for brand context
    6. Download all brand images and videos to `data/brand-assets/`
    7. Run Gemini `gemini-3.5-flash` vision analysis on downloaded images AND videos (via `analyzeBrandVisuals()`)
    8. Use Claude to synthesize all collected information (text + Gemini visual analysis) into a `BrandContext` document
    9. Extract products with Claude (if URL was provided)
    10. Save `brand-context.json` via PUT to `/api/brand-context`
    11. Save products to `products.csv`
    12. Display summary of what was collected

**Files affected:**
- `.claude/commands/collect-brand.md` (new)

---

### Step 8b: Create GETTING-STARTED.md

Write the user-facing guide that's the entry point for anyone new to the tool.

**Actions:**

- Create `GETTING-STARTED.md` at the project root with the following structure:

```markdown
# Ads AI — Getting Started

## What This Tool Does

[1-2 paragraphs: AI-powered ad creation tool that studies your competitors' 
proven ads and generates new ad concepts for your brand. Works for any brand 
in any niche.]

## Prerequisites

- Node.js 18+
- Claude Code CLI installed
- API keys (see Environment Setup below)

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your API keys:
   - `ANTHROPIC_API_KEY` — Claude AI (ad copy generation, analysis) — **required**
   - `GEMINI_API_KEY` — Gemini (image & video analysis) — **required**
   - `FIRECRAWL_API_KEY` — website scraping — *needed if providing a URL*
   - `APIFY_API_TOKEN` — Instagram scraping + Meta Ad Library — **required**
   - `KIE_AI_API_KEY` — AI image generation — **required**
3. Install dependencies: `npm install`
4. Start the app: `npm run dev`
5. Open the dashboard: http://localhost:3000

## How It Works — 4 Steps

### Step 1: Collect Brand Context

Open Claude Code in this project directory and tell it about your brand.
You can provide any combination of:

- A website URL → Claude crawls it and extracts products, brand identity, visuals
- An Instagram handle → Claude scrapes posts and profile
- A keyword or category (e.g., "wireless charging accessories") → Claude uses it as context
- Files (product catalogs, brand guides, images) → Claude reads and analyzes them

Run `/collect-brand` in Claude Code to start the guided flow, or just describe
your brand in your own words.

Claude will:
- Scrape and analyze everything you provide
- Use Gemini AI to analyze your images and videos (visual style, colors, composition)
- Build a complete brand context profile
- Extract your product catalog

**View results**: Open http://localhost:3000/brand to see your brand profile.

### Step 2: Find Competitors

Open http://localhost:3000/competitors in your browser.

The tool searches the Meta Ad Library by keywords related to your brand/products.
It finds advertisers who are actually spending money in your space and ranks them by:

- How long their ads have been running (longer = more profitable)
- How many active ads they have (more = bigger budget)
- Creative diversity (more variety = more sophisticated testing)

**You control**: Which keywords to search, how many ads to scrape per keyword.
Start small (1-3 ads per keyword) to test, then increase.

### Step 3: Analyze What's Working

Open http://localhost:3000/analysis in your browser.

The tool analyzes all scraped competitor ads and identifies patterns in the winners:
- Which hooks grab attention (questions, bold claims, social proof)
- Which copy structures convert (short vs. long, bullets, testimonials)
- Which visual approaches work (text-on-image, UGC, lifestyle, product-only)
- Which offers drive action (discounts, free trials, bundles)

### Step 4: Create Your Ads

Open http://localhost:3000/create in your browser.

The tool generates ad concepts for your brand, each one replicating a proven
competitor ad's strategy:
- AI-written copy (headline, primary text, CTA)
- AI-generated image with the competitor's visual approach adapted for your brand
- Side-by-side comparison: their original vs. your version

**You control**: How many concepts to generate (start with 1), which products to feature.

Every generated creative goes through a quality control check before you see it —
brand consistency, copy quality, and strategic relevance are all scored.

## Tips

- **Start small**: Set all counts to 1 on your first run. Verify each step works 
  before scaling up.
- **Keywords matter**: Narrow keywords ("organic mushroom coffee") find your real 
  competitors better than broad ones ("coffee").
- **Days running is your best signal**: An ad running 60+ days is almost certainly 
  profitable. Focus on those.
- **Check the QC scores**: Green (7+) = good to go. Yellow (5-7) = review carefully. 
  Red (<5) = probably not worth using.

## Folder Structure

- `data/` — all runtime data (brand context, competitor ads, generated concepts)
- `app/` — the Next.js web dashboard
- `.claude/commands/` — Claude Code commands (like `/collect-brand`)
```

- Also create `.env.example` with all required keys as empty placeholders (if it doesn't exist already).

**Files affected:**
- `GETTING-STARTED.md` (new)
- `.env.example` (new, if it doesn't exist)

---

### Step 9: Update Web UI Pages

Update all pages to reflect the 4-stage flow.

**Actions:**

**Brand page (`brand/page.tsx`):**
- Remove the scraping form (URL + Instagram inputs + "Scrape Brand" button)
- Replace with:
  - **If no brand context exists**: Welcome screen with a link to `GETTING-STARTED.md` instructions. Clear call-to-action: "Open Claude Code and run `/collect-brand` to get started."
  - Read-only brand context viewer (if context exists):
    - Brand identity (name, description, tagline, category)
    - Visual analysis from Gemini (if available)
    - Colors, style
    - Sources used
  - Keep the existing products grid and brand visuals gallery (they work well)
  - "Re-collect" button that links to Claude Code instructions

**Competitors/Search page (`competitors/page.tsx`):**
- Rename from "Competitors" to "Find Competitors" (or "Competitor Discovery")
- Replace the current flow entirely:
  - **No brand → show "Collect brand context first" message** (keep existing pattern)
  - **Brand exists, no search yet:**
    - Show suggested keywords (from `extractKeywords()` via API)
    - User can edit/add/remove keywords
    - **Configurable control**: "Ads per keyword" number input (default 15, min 1). For testing, set to 3-5 to get quick results.
    - "Search Meta Ad Library" button
  - **Searching state:**
    - SSE progress per keyword (keep existing progress UI pattern)
  - **Results state:**
    - Show keywords that were searched (as editable badges)
    - Scored advertiser ranking table: name, score, total ads, longest running, active count
    - Expand any advertiser to see their ads in a grid (MetaAdCard — reuse existing component)
    - "Add keyword" input to search additional terms
    - "Re-search" button
    - "Next: Analyze" button

**New Analysis page (`analysis/page.tsx`):**
- Create new page at `/analysis`
- **No competitor data → show "Find competitors first" message**
- **Data exists, no analysis yet:**
  - Summary card: "N ads from M advertisers ready to analyze"
  - "Analyze What's Working" button
- **Analysis running:** Loading spinner
- **Analysis complete:**
  - Pattern cards: each identified winning pattern shows:
    - Pattern name and description
    - Frequency (how many ads use it)
    - Average longevity (performance signal)
    - Example ads (with MetaAdCard thumbnails)
    - Hook type, copy structure, emotional angle, offer type, visual approach
  - Summary/recommendations section
  - "Re-analyze" button
  - "Next: Create Ads" button

**Create page (`create/page.tsx`):**
- Replace "Bloom" with dynamic brand name from context
- Replace "Your Bloom Version" label with "Your {brand.name} Version"
- Update the AI context summary card to include analysis patterns count
- **Configurable controls before generation:**
  - "Number of concepts" number input (default 10, min 1, max 30). For testing, start with 1.
  - Product selector: multi-select checkboxes listing all products from brand context. Defaults to all, but user can select just one for testing.
  - These controls are visible in the generation card, above the "Generate" button.
- **QC indicators on each concept card:**
  - Small badge showing QC score (e.g., "QC: 8.2/10") with color coding: green (7+), yellow (5-7), red (<5)
  - If `qcPassed: false`, show a subtle warning banner on the card with the QC feedback
  - Filter toggle: "Show all" vs "Show passed only" (default: show all, so user can see what was rejected and why)
- Keep side-by-side layout (it's good)
- Keep star/save functionality

**Files affected:**
- `app/src/app/brand/page.tsx`
- `app/src/app/competitors/page.tsx`
- `app/src/app/create/page.tsx`
- `app/src/app/analysis/page.tsx` (new)

---

### Step 10: Update Sidebar

Update to 4 steps with new labels.

**Actions:**

- In `app-sidebar.tsx`:
  - Update `stepItems` array:
    ```typescript
    const stepItems = [
      { title: "Brand Context", href: "/brand", icon: Building2, step: 1 },
      { title: "Find Competitors", href: "/competitors", icon: Search, step: 2 },
      { title: "What's Working", href: "/analysis", icon: TrendingUp, step: 3 },
      { title: "Create Ads", href: "/create", icon: Sparkles, step: 4 },
    ];
    ```
  - Update `isStepComplete()` to check 4 steps:
    - Step 1: `brand-context.json` exists
    - Step 2: `search-results.json` exists with advertisers
    - Step 3: `analysis.json` exists
    - Step 4: `concepts.csv` has entries
  - Remove "Powered by Claude + Perplexity" footer text
  - Replace with "Powered by Claude + Meta Ad Library" or just "Powered by AI"

- Update `app/src/app/api/status/route.ts`:
  - Add `hasAnalysis` field
  - Read from JSON files instead of CSV for brand/competitors
  - Keep existing checks for concepts and knowledge

**Files affected:**
- `app/src/components/app-sidebar.tsx`
- `app/src/app/api/status/route.ts`

---

### Step 11: Clean Up Removed Code

Remove Perplexity integration, old pipeline code, and legacy files.

**Actions:**

- In `app/src/lib/pipeline.ts`:
  - Remove `researchCompetitor()` function (Perplexity)
  - Remove `runCompetitorPhase()` function
  - Simplify `runBrandPhase()` or remove entirely if no longer needed (the `/collect-brand` command handles this agentically)
  - Consider deleting the entire file if the pipeline is fully replaced

- In `app/src/app/api/competitors/route.ts`:
  - Delete the file entirely (replaced by `/api/search/route.ts`)
  - OR keep it as a redirect/alias for backward compatibility

- In `claude.ts`:
  - Remove `suggestCompetitors()` function entirely
  - Remove `analyzeCompetitorAd()` if unused (it's separate from the batch flow)

- In `csv.ts`:
  - Remove `readCompetitors/writeCompetitors` and `competitorColumns`

- Delete `data/competitors.csv` (Perplexity strategy data — no longer produced)

- Delete `data/brand.csv` after migration to JSON (Step 7 handles the migration)

**Files affected:**
- `app/src/lib/pipeline.ts`
- `app/src/app/api/competitors/route.ts`
- `app/src/lib/claude.ts`
- `app/src/lib/csv.ts`
- `data/competitors.csv` (delete)
- `data/brand.csv` (delete after migration)

---

### Step 12: Update CLAUDE.md and Context Files

Update documentation to reflect the new architecture.

**Actions:**

- Update `CLAUDE.md`:
  - User Workflow: 4-stage flow (Brand Context → Find Competitors → What's Working → Create Ads)
  - Describe hybrid architecture (Claude Code chat + web UI)
  - Update API routes table
  - Update tech stack (remove Perplexity, add Gemini vision)
  - Update environment variables (mark Perplexity as unused/optional)
  - Update data conventions (JSON for brand context, search state, analysis)
  - Add `/collect-brand` command documentation
  - Update technical gotchas
  - Remove Bloom-specific references

- Update `context/strategy.md`:
  - Move old completed steps to a "Previous milestones" section
  - Add "Hybrid 4-stage redesign" as completed
  - Update next steps

- Update `context/current-data.md`:
  - Refresh app state table
  - Update data storage section

**Files affected:**
- `CLAUDE.md`
- `context/strategy.md`
- `context/current-data.md`

---

### Step 13: Build Check and Verification

Validate everything compiles and works.

**Actions:**

- Run `npm run build` — must pass cleanly with zero errors
- Verify all API routes return expected responses:
  - `GET /api/brand-context` → brand context JSON or null
  - `GET /api/search` → search state JSON or null
  - `GET /api/analysis` → analysis result JSON or null
  - `GET /api/create` → concepts array
  - `GET /api/status` → all 4 step indicators
- Verify sidebar shows 4 steps with correct completion states
- Start dev server, navigate through all 4 pages, verify no UI crashes
- Verify no remaining "Bloom" references in prompts or UI labels

**Files affected:**
- All modified files (build validation)

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/app/layout.tsx` — imports AppSidebar, no changes needed
- `app/src/components/meta-ad-card.tsx` — stays as-is, used by multiple pages
- `app/src/components/markdown-content.tsx` — stays as-is
- `app/src/lib/kie-ai.ts` — stays as-is, used by batch generation
- `app/src/lib/firecrawl.ts` — stays as-is, used by brand collection
- `app/src/context/pipeline-context.tsx` — may become unused, consider removing

### Updates Needed for Consistency

- All API route imports that reference deleted types (`CompetitorAd`) must be updated
- The `readBrand()` calls throughout the codebase must be updated to `readBrandContext()`
- The `create` page currently references `brand.name` from the old CSV structure — must use new JSON structure
- The `status` API must check new file locations

### Impact on Existing Workflows

- **Users with existing data**: The migration from `brand.csv` to `brand-context.json` means existing data needs a one-time conversion. The brand API GET route should handle both formats during transition.
- **Knowledge base**: Completely unaffected. Stays as-is.
- **Tips page**: Unaffected (generates from knowledge base).
- **Legacy pipeline (`/run`)**: Will break because `pipeline.ts` is being gutted. This page is already hidden from the sidebar and marked as legacy — acceptable.

---

## Validation Checklist

- [ ] `npm run build` passes cleanly
- [ ] No TypeScript errors related to removed types
- [ ] Brand context page displays collected data (or shows instructions if empty)
- [ ] Gemini `gemini-3.5-flash` image analysis produces meaningful visual descriptions
- [ ] Gemini `gemini-3.5-flash` video analysis works on Instagram reels / product videos
- [ ] Keyword search returns scored advertisers from Meta Ad Library
- [ ] Configurable ads-per-keyword control works (test with 1 ad per keyword)
- [ ] Analysis page identifies patterns across scraped ads
- [ ] Batch generation dynamically pairs ads with products (no hardcoded assignments)
- [ ] Configurable concept count works (test generating 1 concept)
- [ ] Product selector works (test with 1 product selected)
- [ ] Quality control scores each generated concept and shows QC badge in UI
- [ ] QC retry works: concepts scoring <7 get one regeneration attempt with feedback
- [ ] QC filter toggle works: "show all" vs "show passed only"
- [ ] Sidebar shows 4 steps with correct completion indicators
- [ ] No "Bloom" references remain in UI labels or Claude prompts
- [ ] No Perplexity API calls remain in the codebase
- [ ] `suggestCompetitors()` function is removed
- [ ] `/collect-brand` command exists and provides clear instructions
- [ ] `GETTING-STARTED.md` exists at project root with full setup + walkthrough
- [ ] `.env.example` exists with all required API key placeholders
- [ ] CLAUDE.md reflects the new architecture
- [ ] MetaAdCard component still works correctly on all pages
- [ ] Image proxy still serves brand assets, competitor ads, and generated images

---

## Success Criteria

The implementation is complete when:

1. A new user can run `/collect-brand` in Claude Code, provide any combination of inputs (URL, keyword, Instagram, files), and see their brand context displayed on the web UI — including Gemini visual analysis of their images and videos.
2. Searching the Meta Ad Library by keyword returns scored advertisers ranked by real performance signals, with no Claude guessing or Perplexity involved. User can control how many ads to scrape per keyword (1 for testing, 15+ for production).
3. The "What's Working" analysis identifies concrete patterns across competitor ads that users can review before generating concepts.
4. Batch generation dynamically pairs top competitor ads with the user's products and creates concepts without any hardcoded brand-specific data. User can generate 1 concept for 1 product to test, then scale up.
5. Every generated creative passes a quality control gate that checks brand consistency, copy quality, and strategic relevance. Failed creatives get one retry, and QC scores are visible in the UI.
6. The entire flow works for any brand/niche — tested with at least one non-Bloom example.

---

## Notes

- **Implementation order matters**: Steps 1-3 (types, Gemini, scoring) are foundation. Steps 4-7 (APIs) depend on them. Steps 8-10 (UI) depend on APIs. Steps 11-12 (cleanup) come last. Step 6b (QC) depends on Step 6 but can be implemented as part of it.
- **Incremental migration**: Keep the old brand API working during transition so the app doesn't break mid-implementation. Only delete old files in Step 11 after everything new is working.
- **Testing workflow**: With configurable batch sizes, the implementation can be validated incrementally. After each step, test with count=1 before scaling up. This also saves API credits during development.
- **QC cost consideration**: The QC step adds one extra Claude call per concept (for copy evaluation) and one Gemini call per generated image (for visual evaluation). At scale (30 concepts), this adds ~60 API calls. The cost is justified by preventing garbage output — one bad creative shown to a user is worse than 2 extra API calls to catch it.
- **Gemini model upgrade**: Moving from `gemini-2.5-flash` to `gemini-3.5-flash` across the board. The 2.0-flash model is shutting down June 1, 2026, so this is necessary anyway.
- **Future considerations**: Multi-brand support (saving/switching between brand contexts) was mentioned as a goal. The JSON-based brand context storage makes this straightforward later — just store multiple JSON files and add a brand selector. Not in scope for this plan.
- **Perplexity could come back later**: If the user later wants general market intelligence (not just ad data), Perplexity could be re-added as an optional enrichment step. The architecture doesn't prevent it.
- **The `/collect-brand` command is a bridge**: Long-term, the web UI could get a more sophisticated input form (drag-and-drop files, multi-URL, etc.). For now, Claude Code chat is the most flexible input method and the fastest to implement.

---

## Implementation Notes

**Implemented:** 2026-05-28

### Summary

All 13 steps of the plan were executed in order. The app has been transformed from a 3-step Bloom-specific flow into a 4-stage white-label system with keyword-based competitor discovery, pattern analysis, dynamic ad generation, and quality control.

### Deviations from Plan

- **Gemini model**: Kept `gemini-2.5-flash` instead of upgrading to `gemini-3.5-flash`. The plan referenced `gemini-3.5-flash` which may not exist yet. The model string is centralized in `gemini.ts` via the `MODEL` constant for easy switching later.
- **Legacy brand CSV preserved**: Instead of deleting `brand.csv` and `readBrand()`/`writeBrand()`, they were kept for backward compatibility. All APIs check `readBrandContext()` first and fall back to `readBrand()`. The brand POST endpoint writes both formats.
- **Pipeline.ts simplified rather than deleted**: The legacy pipeline is still used by the `/run` page. Removed Perplexity calls and CompetitorAd type usage, kept the brand scraping phase.
- **Gemini visual QC for generated images**: The plan included `evaluateGeneratedImage()` using Gemini vision to analyze generated ad images. This was deferred — the copy-level QC via Claude is implemented and functional. Image QC can be added later.
- **`competitors.csv` and `brand.csv` not deleted**: Kept for migration path. New code reads JSON first, CSV as fallback.

### Issues Encountered

- None — all steps completed cleanly. Build passes with zero TypeScript errors.
