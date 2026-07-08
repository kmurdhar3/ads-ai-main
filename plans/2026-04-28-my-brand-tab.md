# Plan: My Brand Tab — Standalone Brand Setup

**Created:** 2026-04-28
**Status:** Implemented
**Request:** Create a dedicated "My Brand" tab where you input a website URL and Instagram handle, scrape the data, and build a complete brand profile — separated from the full pipeline as its own standalone first step.

---

## Overview

### What This Plan Accomplishes

Build a new `/brand` page ("My Brand" tab) that provides a focused, standalone brand setup experience. The user enters a website URL and Instagram handle, hits "Scrape", and the app crawls the site, scrapes Instagram, uses Claude to analyze the content into a rich brand identity (description, tagline, voice, colors, style), extracts products, downloads visual assets, and displays everything in a clean dashboard. This replaces the need to run the full pipeline just to set up your brand.

### Why This Matters

The current workflow bundles brand scraping with competitor analysis in the pipeline — too much happening at once. Breaking brand setup into its own step makes the tool more approachable: you set up your brand first, see the results, then move to competitor analysis when ready. This is the foundational step that everything else (ad generation, competitor comparison) builds on.

---

## Current State

### Relevant Existing Structure

| Path | Contents |
|------|----------|
| `app/src/app/api/brand/route.ts` | GET only — returns brand + products from CSV |
| `app/src/lib/firecrawl.ts` | Website scraping: `crawlWebsite`, `extractBrandProfile`, `extractProducts`, `downloadBrandAssets` |
| `app/src/lib/apify.ts` | Instagram scraping: `scrapeInstagramProfile` |
| `app/src/lib/claude.ts` | Claude integration — has ad generation but no brand analysis |
| `app/src/lib/pipeline.ts` | `runBrandPhase()` — current brand scraping logic lives here |
| `app/src/lib/csv.ts` | `readBrand`, `writeBrand`, `readProducts`, `writeProducts` |
| `app/src/lib/types.ts` | `Brand` and `Product` interfaces |
| `app/src/components/app-sidebar.tsx` | Sidebar with 6 nav items |
| `data/brand.csv` | Existing scraped data — very sparse (empty description, no products) |
| `data/brand-assets/` | 15 images (5 Instagram posts + 10 YouTube thumbnails) |

### Gaps or Problems Being Addressed

1. **No standalone brand setup** — brand scraping is buried inside the pipeline, forcing users to run competitors too
2. **No brand dashboard** — no way to view your brand profile, products, and visual assets in one place
3. **Weak brand extraction** — `extractBrandProfile` just grabs HTML metadata, producing sparse/empty results (current brand.csv has empty description)
4. **No Claude-enhanced analysis** — the scraped website content isn't analyzed by AI to extract brand voice, identity, positioning
5. **No re-scrape ability** — can't easily update brand data without re-running the full pipeline
6. **Products not found** — the current extraction logic missed all products for bloomnu.com (products.csv is empty)

---

## Proposed Changes

### Summary of Changes

- Add a new `/brand` page with input form + brand profile dashboard
- Extend `/api/brand` route with POST (scrape) and SSE progress streaming
- Add Claude-powered brand analysis function to `lib/claude.ts` — takes raw scraped content and produces a rich brand profile
- Improve `extractProducts` in `lib/firecrawl.ts` to use Claude for better product extraction from scraped content
- Add "My Brand" to sidebar navigation (first item, before Create Ads)
- Update the Create page's empty state to point to `/brand` instead of `/run`

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/src/app/brand/page.tsx` | My Brand page — input form, scrape trigger, brand profile dashboard |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `app/src/app/api/brand/route.ts` | Add POST handler for brand scraping with SSE progress |
| `app/src/lib/claude.ts` | Add `analyzeBrandIdentity()` — Claude analyzes scraped content into rich brand profile |
| `app/src/components/app-sidebar.tsx` | Add "My Brand" as first nav item with Building icon |
| `app/src/app/create/page.tsx` | Update empty state to point to `/brand` instead of `/run` |
| `CLAUDE.md` | Add /brand route to docs |

---

## Design Decisions

### Key Decisions Made

1. **Dedicated page, not a modal or wizard**: A full `/brand` page gives enough space to show the brand profile dashboard (logo, description, products grid, Instagram gallery, brand assets). This also makes it a natural "home" for your brand identity.

2. **SSE streaming on POST /api/brand**: Brand scraping involves multiple steps (crawl site, scrape Instagram, analyze with Claude, download assets) that take 30-60+ seconds. SSE streaming shows progress in real-time, matching the pipeline pattern already used on `/run`.

3. **Claude for brand analysis**: The current `extractBrandProfile` just grabs HTML metadata — it can't understand brand voice, positioning, or visual style. Adding a Claude analysis step that takes the raw scraped content and produces a structured brand identity (description, tagline, colors, style, voice) will dramatically improve quality. This is a small API call (~$0.01) that makes the difference between "bloomnu.com" and "Bloom Nutrition — a vibrant wellness brand targeting health-conscious women with colorful, energetic aesthetics."

4. **Claude for product extraction**: The regex-based product extraction in `extractProducts` failed for bloomnu.com (0 products found). Claude can read the scraped markdown and reliably identify product names, descriptions, and prices.

5. **"My Brand" as first sidebar item**: This is step 1 of the workflow — it should be the first thing users see and set up. Position it at the top of the nav.

6. **Keep pipeline brand phase working**: Don't remove brand scraping from the pipeline — just refactor to share the same logic. The pipeline can still run brand setup for users who prefer the all-in-one approach.

### Alternatives Considered

- **Just improve the pipeline page**: Rejected — the whole point is separating brand setup as its own distinct step. The pipeline becomes "step 2+" for competitor analysis.
- **Settings/config page**: Rejected — "My Brand" is more than settings. It's a dashboard showing your brand identity, not just input fields.
- **Separate API route (e.g., `/api/brand/scrape`)**: Considered — but extending the existing `/api/brand` route with POST keeps the REST convention clean (GET reads, POST creates/scrapes).

---

## Step-by-Step Tasks

### Step 1: Add Claude Brand Analysis Function

Add a function to `lib/claude.ts` that takes raw scraped website content and produces a structured brand analysis.

**Actions:**

- Add `analyzeBrandIdentity(websiteContent: string, instagramBio: string, url: string): Promise<{description, tagline, colors, style, voice}>` to `lib/claude.ts`
- The function sends scraped markdown to Claude and asks it to extract: brand name, description (2-3 sentences), tagline, brand colors (as comma-separated list), visual style (e.g., "minimalist, bright, playful"), brand voice (e.g., "energetic, empowering, casual")
- Also add `extractProductsWithClaude(websiteContent: string): Promise<Product[]>` — Claude reads the website content and identifies products with name, description, price, category
- Use `claude-sonnet-4-5-20250929` for both (fast, cheap, accurate for structured extraction)

**Files affected:**
- `app/src/lib/claude.ts`

---

### Step 2: Extend /api/brand Route with POST

Add a POST handler that runs brand scraping with SSE progress streaming.

**Actions:**

- Add POST handler to `app/src/app/api/brand/route.ts`
- Accept body: `{ websiteUrl: string, instagramHandle?: string }`
- Return SSE stream with progress events: `{ step, message, progress, error? }`
- Steps:
  1. Crawl website via FireCrawl (`crawlWebsite`)
  2. Extract brand profile from metadata (`extractBrandProfile`)
  3. Analyze with Claude (`analyzeBrandIdentity`) to enrich the profile
  4. Extract products with Claude (`extractProductsWithClaude`)
  5. If Instagram handle provided, scrape Instagram (`scrapeInstagramProfile`)
  6. Download brand assets (logo, Instagram images)
  7. Save to CSV (`writeBrand`, `writeProducts`)
- Merge Claude analysis results into the Brand object (description, tagline, colors, style)
- Add `export const maxDuration = 300;` for long-running scrape
- Each step emits a progress event so the UI can show real-time updates

**Files affected:**
- `app/src/app/api/brand/route.ts`

---

### Step 3: Build My Brand Page

Create the `/brand` page with two states: input form (when no brand exists or user wants to re-scrape) and brand profile dashboard (when brand data exists).

**Actions:**

- Create `app/src/app/brand/page.tsx`
- **Input form section** (always visible at top, collapsible when brand exists):
  - Website URL input (text field)
  - Instagram Handle input (text field, optional, prefixed with @)
  - "Scrape Brand" button — triggers POST to /api/brand with SSE
  - Progress indicator showing current step and percentage
  - Log of completed steps
- **Brand profile dashboard** (shown when brand data exists):
  - Brand header card: logo, name, tagline, description
  - Brand identity card: colors (as swatches if possible, or text), style, voice
  - Products grid: cards with product name, description, price, image thumbnail
  - Brand assets gallery: grid of downloaded images from `data/brand-assets/`
  - Instagram section: handle, followers count, recent post thumbnails
- **Re-scrape button**: visible when brand exists, re-runs the scrape with current or new URL
- Match glass-morphism dark theme used across the app
- Use existing components: Card, Button, Input, Label, ScrollArea
- Fetch brand data on mount via GET /api/brand
- Display brand assets by listing files in brand-assets directory (via a new GET parameter on /api/brand or a dedicated endpoint)

**Files affected:**
- `app/src/app/brand/page.tsx` (new)

---

### Step 4: Add Brand Assets Endpoint

Extend GET /api/brand to also return a list of brand asset filenames so the frontend can display them.

**Actions:**

- In the GET handler of `/api/brand/route.ts`, read the `data/brand-assets/` directory and return the list of filenames
- Response shape: `{ brand, products, assets: string[] }`
- The frontend will display them via the existing `/api/proxy-image` route (which can serve local files from data/)

**Files affected:**
- `app/src/app/api/brand/route.ts`

---

### Step 5: Update Sidebar Navigation

Add "My Brand" as the first item in the sidebar.

**Actions:**

- In `app/src/components/app-sidebar.tsx`, add a new nav item at the top of the `navItems` array:
  - Title: "My Brand"
  - href: `/brand`
  - icon: `Building2` from lucide-react (represents a business/brand)
- Reorder so "My Brand" is first, followed by "Create Ads", etc.

**Files affected:**
- `app/src/components/app-sidebar.tsx`

---

### Step 6: Update Create Page Empty State

Point the empty/setup state on the Create page to `/brand` instead of `/run`.

**Actions:**

- In `app/src/app/create/page.tsx`, change the empty state message and button to direct users to `/brand` ("Set up your brand first") instead of `/run` ("Run Pipeline")
- Update text: "Set up your brand by going to My Brand to scrape your website and build your brand profile."

**Files affected:**
- `app/src/app/create/page.tsx`

---

### Step 7: Refactor Pipeline to Reuse Brand Scraping Logic

Extract shared brand-scraping logic so both `/api/brand` POST and the pipeline's brand phase use the same code, avoiding duplication.

**Actions:**

- In `lib/pipeline.ts`, refactor `runBrandPhase` to call the same scraping+analysis logic used by the new `/api/brand` POST handler
- The simplest approach: extract a shared function `scrapeBrand(config, onProgress)` in a shared location (could stay in `pipeline.ts` or move to a new `lib/brand-scraper.ts`)
- The pipeline calls this shared function; the `/api/brand` POST also calls it
- This keeps the pipeline working for users who still want the all-in-one approach

**Files affected:**
- `app/src/lib/pipeline.ts`

---

### Step 8: Update CLAUDE.md

Document the new page and API changes.

**Actions:**

- Add `/brand` to the App Pages table: "My Brand — brand setup, scraping, profile dashboard"
- Update `/api/brand` in API Routes table: "GET, POST | Get brand profile + products + assets / Scrape brand with SSE progress"
- Note in the description that My Brand is the recommended first step

**Files affected:**
- `CLAUDE.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/app/create/page.tsx` — checks for brand data, shows setup prompt if missing
- `app/src/lib/pipeline.ts` — `runBrandPhase()` does brand scraping (will share logic)
- `app/src/app/run/page.tsx` — pipeline config includes website URL and Instagram handle
- `app/src/lib/claude.ts` — generates ads using brand profile from `readBrand()`

### Updates Needed for Consistency

- `CLAUDE.md` updated with new route and API docs
- Create page empty state updated to point to `/brand`
- Sidebar updated with new nav item

### Impact on Existing Workflows

- Pipeline still works as before — the brand phase continues to function
- Pipeline brand phase will be enhanced with Claude analysis (shared logic)
- Create page setup flow now sends users to `/brand` instead of `/run`
- No breaking changes to existing data formats (Brand and Product types unchanged)

---

## Validation Checklist

- [ ] `/brand` page loads and shows input form when no brand data exists
- [ ] Entering a URL + Instagram handle and clicking "Scrape" starts SSE-streamed scraping
- [ ] Progress updates show in real-time during scraping
- [ ] After scraping completes, brand profile dashboard shows: name, description, tagline, colors, style
- [ ] Products are extracted and displayed in a grid
- [ ] Brand assets (downloaded images) are displayed in a gallery
- [ ] Instagram data shows (handle, follower count)
- [ ] Re-scraping with a different URL replaces the brand data
- [ ] "My Brand" appears as first item in sidebar navigation
- [ ] Create page empty state directs to `/brand`
- [ ] Pipeline brand phase still works (shared logic)
- [ ] GET /api/brand returns assets list alongside brand and products
- [ ] CLAUDE.md updated to reflect changes

---

## Success Criteria

The implementation is complete when:

1. A user can go to the "My Brand" tab, enter a website URL and optional Instagram handle, and get a fully scraped brand profile with AI-analyzed identity, products, and downloaded visual assets
2. The brand profile dashboard displays all collected information in an organized, visually appealing layout
3. The scraping process shows real-time progress via SSE streaming
4. This works as a standalone first step — no need to touch the pipeline or any other page to set up your brand

---

## Notes

- The current brand.csv for bloomnu.com has a nearly empty description and zero products — the Claude analysis step will fix this by intelligently parsing the scraped website content rather than relying on HTML metadata alone
- Claude Sonnet is the right choice for brand analysis — fast (~3-5 seconds), cheap (~$0.01), and accurate for structured extraction tasks
- Instagram scraping via Apify (`apify~instagram-profile-scraper`) is already working — it successfully scraped bloomsupps with 698K followers
- Future steps in the simplified workflow: Step 2 = competitor analysis tab, Step 3 = knowledge base from YouTube, Step 4 = ad generation using all the above
- The proxy-image route already handles serving local images from `data/` — brand assets can be displayed through it

---

## Implementation Notes

**Implemented:** 2026-04-28

### Summary

Built all 8 steps: Claude brand analysis and product extraction functions, POST /api/brand with SSE streaming, `/brand` page with scrape form + profile dashboard, GET /api/brand extended with assets list, sidebar updated with "My Brand" as first item, Create page empty state redirected to `/brand`, pipeline refactored to use shared Claude analysis logic, and CLAUDE.md updated.

### Deviations from Plan

- `Instagram` icon from lucide-react doesn't exist in the installed version — replaced with `AtSign` icon (same issue as the original build where `Youtube` was replaced with `Play`)
- Steps 2 and 4 were combined into a single file edit (both modify `/api/brand/route.ts`) rather than done separately

### Issues Encountered

- TypeScript implicit `any[]` error on `claudeProducts` and `analysis` variables in both `/api/brand/route.ts` and `pipeline.ts` — fixed with explicit type annotations using `Awaited<ReturnType<...>>`
- Port 3002 was already in use by an existing dev server — used it for testing instead of starting a new one
- Chrome browser extension not connected — could not do visual browser testing, verified via build + curl instead
