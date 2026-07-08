# Plan: Real Competitor Ads + Complete Meta Ad Structure

**Created:** 2026-04-28
**Status:** Complete
**Request:** Scrape actual competitor ads from Meta Ad Library, display them visually, and restructure generated ad output to match real Meta ad anatomy.

---

## Overview

### What This Plan Accomplishes

Transforms the competitor research from text-only Perplexity summaries into a visual ad gallery showing real competitor creatives (images, copy, CTAs, placements, performance signals). Restructures our generated ad output to match the complete Meta ad anatomy (primary text, headline, description, CTA, placements). Adds side-by-side competitor inspiration on the Create page.

### Why This Matters

Users need to SEE what their competitors are actually running — not just read text descriptions. They also need their generated ads to be complete and ready-to-use in Meta Ads Manager, with every field filled in exactly as Meta expects. This is the difference between a toy tool and a professional one.

---

## Current State

### Relevant Existing Structure

- `app/src/lib/apify.ts` — **Already has `scrapeMetaAds()` function** that calls `apify~facebook-ads-scraper`, returns `MetaAd[]` with headline, body, ctaText, imageUrl, videoUrl, linkUrl, startDate, isActive, impressions. Currently UNUSED.
- `app/src/lib/types.ts` — `CompetitorAd` type has imageUrl, headline, body, ctaText fields but they're all set to empty strings. `AdConcept` has headline, body, ctaText but no separate description, no placements.
- `app/src/app/api/competitors/route.ts` — Only uses Perplexity for text research, never scrapes actual ads.
- `app/src/app/competitors/page.tsx` — Shows expandable text cards only, no visuals.
- `app/src/app/api/create/route.ts` — Generates concept with basic fields.
- `app/src/app/create/page.tsx` — Displays concepts with headline/body/CTA but not structured as real Meta ads.
- `app/src/lib/csv.ts` — `competitorColumns` and `conceptColumns` would need expansion.

### Gaps or Problems Being Addressed

1. **No actual competitor ads visible** — the scrapeMetaAds function exists but is never called; users only see Perplexity text summaries
2. **No competitor ad images** — no visuals at all on the Competitors page
3. **Generated ads are incomplete** — missing "description" field, missing placement recommendations, not structured like real Meta ads
4. **No connection between competitor ads and generated concepts** — Create page doesn't show which competitor ads inspired the concept

---

## Proposed Changes

### Summary of Changes

- Add a "scrape ads" phase to competitor research that calls Meta Ad Library via Apify after Perplexity research
- Download competitor ad images to `data/competitor-ads/`
- Redesign competitors results page to show actual ad cards with images, copy breakdown, and performance signals (days running, active status)
- Expand `AdConcept` type to include `description` (Meta link description), `placements` (recommended placements), and `inspirationAdIds` (which competitor ads informed it)
- Restructure the generated concept display to match real Meta ad anatomy
- Update Claude prompt to output full Meta ad structure
- Show competitor ad inspiration on the Create page

### New Files to Create

| File Path | Purpose |
|-----------|---------|
| `app/src/components/meta-ad-card.tsx` | Reusable component rendering a single ad in Meta ad format (image + primary text + headline + description + CTA + placement badges) |
| `app/src/components/competitor-ad-gallery.tsx` | Gallery view of scraped competitor ads with performance signals |

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `app/src/lib/types.ts` | Add `MetaAdEntry` type for stored competitor ads, expand `AdConcept` with `description`, `placements`, `inspirationAdIds` |
| `app/src/lib/apify.ts` | Update `scrapeMetaAds()` to handle Apify's actual response format more robustly, add `platforms` field |
| `app/src/lib/csv.ts` | Add `readMetaAds()`, `writeMetaAds()`, update `conceptColumns` |
| `app/src/app/api/competitors/route.ts` | Add `action: "scrape-ads"` handler that calls Meta Ad Library, downloads images, saves to CSV |
| `app/src/app/competitors/page.tsx` | Complete redesign: show ad gallery per competitor with images, copy breakdown, performance signals — keep Perplexity analysis as expandable section |
| `app/src/app/api/create/route.ts` | Pass competitor ad data (not just analysis text) to concept generation |
| `app/src/lib/claude.ts` | Update `generateAdConcept()` prompt to output full Meta ad structure (primary text, headline, description, CTA, placements) |
| `app/src/app/create/page.tsx` | Display concepts in Meta ad format, show inspiring competitor ads |
| `CLAUDE.md` | Update API routes, data conventions, architecture details |

### Files to Delete (if any)

None.

---

## Design Decisions

### Key Decisions Made

1. **Two-phase competitor research: Perplexity THEN Meta Ad Library scrape** — Perplexity gives strategic context (targeting, testing approach), Meta Ad Library gives actual creatives. Both are valuable. Run them sequentially: Perplexity first (~60s), then ad scrape (~30s). Total: ~90-120s.

2. **Download competitor ad images locally** — Store in `data/competitor-ads/{advertiser-slug}/` so they display reliably through our proxy. Meta Ad Library CDN URLs expire.

3. **Performance signals = days running + active status + variation count** — We can't get actual ROI data, but ads running for 30+ days are almost certainly profitable (advertisers kill losers within days). Show "Running for X days" as the key signal.

4. **Full Meta ad structure for generated concepts** — The concept output must produce: Primary Text (body), Headline, Description (link description), CTA Button text, Placements array. This matches exactly what Meta Ads Manager expects when creating an ad.

5. **Separate `meta-ads.csv` from `competitors.csv`** — Keep Perplexity analyses in `competitors.csv` and actual scraped ads in `meta-ads.csv`. One competitor may have many ads. This avoids bloating the competitor research file.

6. **Limit to 10 ads per competitor** — Enough to see patterns without overwhelming the UI or storage. That's up to 60 ads total for 6 competitors.

### Alternatives Considered

- **Scraping ads inline during Perplexity research** — Rejected because it would make the research phase too long and complex. Better as a separate step that can be re-run independently.
- **Storing ads directly in `competitors.csv`** — Rejected because one competitor has many ads (1-to-many relationship). Separate CSV is cleaner.
- **Not downloading images** — Rejected because Meta CDN URLs expire; images would break after hours/days.

### Open Questions

None — all decisions resolved. Ad scraping is automatic after Perplexity research completes. A "Refresh Ads" button allows manual re-scraping later.

---

## Step-by-Step Tasks

### Step 1: Expand Types and Data Layer

Add the new types and CSV functions to support stored Meta ads and expanded concepts.

**Actions:**

- Add `MetaAdEntry` interface to `types.ts`:
  ```typescript
  export interface MetaAdEntry {
    id: string;
    advertiser: string;
    headline: string;
    primaryText: string;
    description: string;
    ctaText: string;
    imageUrl: string;
    localImagePath: string;
    videoUrl: string;
    linkUrl: string;
    platforms: string; // comma-separated: "facebook,instagram"
    startDate: string;
    isActive: boolean;
    daysRunning: number;
    scrapedAt: string;
  }
  ```
- Expand `AdConcept` interface: add `description: string`, `placements: string`, `inspirationAdIds: string`
- In `csv.ts`: add `metaAdColumns`, `readMetaAds()`, `writeMetaAds()`, `appendMetaAds()` functions
- Update `conceptColumns` to include new fields

**Files affected:**

- `app/src/lib/types.ts`
- `app/src/lib/csv.ts`

---

### Step 2: Update Apify Integration

Ensure `scrapeMetaAds()` extracts all needed fields including platforms/placements.

**Actions:**

- Update `MetaAd` interface in `apify.ts` to include `platforms` (array or string of where the ad runs)
- Make the field mapping more robust to handle different Apify response formats
- Add a helper `downloadAdImage(url: string, advertiser: string): Promise<string>` that downloads an ad creative to `data/competitor-ads/{slug}/` and returns the local path

**Files affected:**

- `app/src/lib/apify.ts`

---

### Step 3: Add Ad Scraping to Competitor API

Add a new action to the competitors route that scrapes real ads from Meta Ad Library.

**Actions:**

- Add `action: "scrape-ads"` handler to POST route
- For each competitor name, call `scrapeMetaAds(name, { limit: 10 })`
- Download each ad's image to `data/competitor-ads/{slug}/`
- Calculate `daysRunning` from `startDate`
- Save all ads to `meta-ads.csv` via `writeMetaAds()`
- Stream progress via SSE (same pattern as research)
- Modify the existing `action: "research"` flow to automatically trigger ad scraping after Perplexity completes (combined flow)

**Files affected:**

- `app/src/app/api/competitors/route.ts`

---

### Step 4: Create Meta Ad Card Component

Build a reusable component that renders an ad exactly like it appears in Meta (image on top, primary text, headline, description, CTA button).

**Actions:**

- Create `app/src/components/meta-ad-card.tsx`
- Layout:
  - Ad image (or video thumbnail) at top, aspect ratio preserved
  - Primary text below image (truncatable with "See more")
  - Horizontal divider
  - Headline (bold, larger)
  - Description (smaller, muted)
  - CTA button (styled badge)
  - Footer: platform badges (Facebook, Instagram), days running badge, active/inactive status
- Accept props: ad data object, size variant (compact for gallery, full for detail)
- Use the glass-morphism card style consistent with the rest of the app

**Files affected:**

- `app/src/components/meta-ad-card.tsx` (new)

---

### Step 5: Create Competitor Ad Gallery Component

Build the gallery that shows all scraped ads grouped by competitor.

**Actions:**

- Create `app/src/components/competitor-ad-gallery.tsx`
- Show competitor name as section header with ad count
- Grid of MetaAdCards (2-3 per row)
- Performance signal highlights: "Top ad: running X days", "Y active ads"
- Expandable Perplexity analysis below the ad gallery for each competitor

**Files affected:**

- `app/src/components/competitor-ad-gallery.tsx` (new)

---

### Step 6: Redesign Competitors Page

Replace the current text-only results view with the visual ad gallery.

**Actions:**

- Keep existing states: loading, no-brand, suggest, researching
- Update the "researching" state to show two phases: "Analyzing strategy..." then "Scraping actual ads..."
- Replace the "results" state entirely:
  - Show competitor ad gallery (grouped by competitor)
  - Each competitor section: their real ads in a grid + expandable strategy analysis from Perplexity
  - Performance signals prominently displayed (days running = key indicator)
  - "Refresh Ads" button to re-scrape without re-running Perplexity

**Files affected:**

- `app/src/app/competitors/page.tsx`

---

### Step 7: Update Ad Concept Generation (Claude Prompt + API)

Restructure the Claude prompt to output complete Meta ad anatomy and reference specific competitor ads.

**Actions:**

- Update `generateAdConcept()` in `claude.ts`:
  - Include actual competitor ad copy (not just analysis) in the prompt — show best-performing ads (longest-running) as examples
  - Change output JSON to include: `primaryText`, `headline`, `description`, `ctaText`, `placements` (array), `inspirationAdIds` (which competitor ads inspired this)
  - Map `primaryText` to `body` field for backward compat, or rename body→primaryText everywhere
- Update `/api/create/route.ts`:
  - Read `meta-ads.csv` and pass top competitor ads (sorted by daysRunning) to the prompt
  - Save the new fields to concepts.csv

**Files affected:**

- `app/src/lib/claude.ts`
- `app/src/app/api/create/route.ts`

---

### Step 8: Redesign Create Page — Meta Ad Format Output

Display generated concepts in the real Meta ad format with competitor inspiration.

**Actions:**

- Use the `MetaAdCard` component to display each generated concept (same visual structure as competitor ads — consistent mental model)
- Add fields visually:
  - Primary Text (the main body copy)
  - Headline (bold, below image)
  - Description (below headline)
  - CTA button
  - Placement badges (Feed, Story, Reel)
- Add "Inspired by" section below each concept showing 1-3 competitor ad thumbnails that informed it
- Keep rationale as expandable section

**Files affected:**

- `app/src/app/create/page.tsx`

---

### Step 9: Ensure Image Proxying Works

Make sure competitor ad images are served correctly.

**Actions:**

- Verify `/api/proxy-image` handles the `data/competitor-ads/` directory
- Add `competitor-ads` prefix support if needed
- Test that images display in the UI

**Files affected:**

- `app/src/app/api/proxy-image/route.ts` (may need minor update)

---

### Step 10: End-to-End Quality Control (MANDATORY)

Run the full app, trigger real competitor research + ad scraping, and validate everything works before reporting done.

**Actions:**

- Start the dev server (`npm run dev`)
- Navigate to `/competitors` in the browser, trigger a full competitor research cycle with real brand data
- Verify Apify scrapes return actual ads with images, copy, CTAs, start dates
- Check `data/competitor-ads/` for downloaded images — verify they're valid image files
- Check `data/meta-ads.csv` for populated data — verify all fields are filled
- Visually inspect the Competitors page: do ad cards render with real images? Is copy readable? Do performance signals (days running) show?
- Navigate to `/create`, generate a new ad concept
- Verify the concept includes all 5 Meta ad fields (primary text, headline, description, CTA, placements)
- Visually inspect the Create page: does the MetaAdCard render properly? Does "Inspired by" show real competitor ad thumbnails?
- Check the app builds cleanly: `npm run build`
- Fix any issues found during QC — do NOT skip this step

**Files affected:**

- Any files needing fixes discovered during QC

---

### Step 11: Update CLAUDE.md and Context

Reflect all changes in documentation.

**Actions:**

- Update CLAUDE.md: API routes (new action), data conventions (new CSV, new image directory), architecture details
- Update `context/current-data.md` with new features

**Files affected:**

- `CLAUDE.md`
- `context/current-data.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/app/api/status/route.ts` — reads competitor count, may want to add metaAdCount
- `app/src/components/app-sidebar.tsx` — step completion indicators depend on competitor data
- `app/src/app/api/proxy-image/route.ts` — must serve new image paths

### Updates Needed for Consistency

- `CLAUDE.md` — new API action, new data directory, new types
- `context/current-data.md` — feature status update
- `context/strategy.md` — mark this as completed when done

### Impact on Existing Workflows

- Competitor research takes longer (adds ~30s for ad scraping after Perplexity)
- `competitors.csv` format unchanged — new data goes in `meta-ads.csv`
- `concepts.csv` gains new columns — existing concepts will have empty values for new fields (backward compatible)
- No breaking changes to existing functionality

---

## Validation Checklist

- [ ] `scrapeMetaAds()` called during competitor research and returns actual ads
- [ ] Competitor ad images downloaded to `data/competitor-ads/` and served via proxy
- [ ] Competitors page shows real ad visuals with copy breakdown and performance signals
- [ ] Days running calculated and displayed prominently
- [ ] Generated ad concepts include all 5 Meta ad fields (primary text, headline, description, CTA, placements)
- [ ] Create page displays concepts in Meta ad format using MetaAdCard component
- [ ] Competitor inspiration shown on Create page
- [ ] Existing competitor research still works (Perplexity analysis preserved)
- [ ] App builds without errors (`npm run build`)
- [ ] CLAUDE.md updated to reflect new structure
- [ ] **QC: Real scrape triggered** — actual Apify calls made, real ads returned
- [ ] **QC: Images verified** — downloaded images are valid, display correctly in browser
- [ ] **QC: Copy verified** — ad text (primary text, headline, description, CTA) populated and sensible
- [ ] **QC: Performance signals verified** — days running shows real values, active/inactive correct
- [ ] **QC: Generated concept verified** — all 5 fields present, placements populated, inspiration links work
- [ ] **QC: Visual inspection** — both pages look polished, professional, no broken layouts or missing data

---

## Success Criteria

The implementation is complete when:

1. A user can see actual competitor ads (images + full copy) on the Competitors page, with "running for X days" performance signals
2. Generated ad concepts output all 5 Meta ad fields and show recommended placements
3. The Create page shows which competitor ads inspired each generated concept
4. The visual presentation is consistent — both competitor ads and generated ads use the same MetaAdCard component format

---

## Notes

- The Apify `facebook-ads-scraper` actor may have rate limits or require specific input format. Test with one competitor first before running all 6.
- Meta Ad Library only shows currently active ads (or recently inactive). Ads from months ago may not be available.
- Image download adds I/O time. Consider parallel downloads (Promise.all with concurrency limit of 5).
- The `daysRunning` metric is the strongest free signal of ad performance. An ad running 60+ days is almost certainly profitable. Display this prominently.
- Future enhancement: video ad support (thumbnail + play button), carousel ad support (multiple images).
