# Plan: Visual-First Page Redesign

**Created:** 2026-05-31
**Status:** Implemented
**Request:** Redesign all 5 app pages so visuals dominate above the fold, text is condensed/folded, and every page immediately looks valuable and compelling.

---

## Overview

### What This Plan Accomplishes

Transforms every page in the app from text-heavy layouts to visual-first designs. The guiding principle: a user should see beautiful, compelling visuals the instant any page loads — before reading a single word. Text metadata is condensed into compact inline elements or folded behind toggles, while images, thumbnails, and media take center stage.

### Why This Matters

A page full of text feels like work. A page full of visuals feels valuable. Users should see proof-of-work and beauty instantly — brand images, competitor ad thumbnails, hook visuals, generated creatives, video thumbnails — without scrolling or clicking to reveal them. This directly serves the product vision of looking professional and trustworthy, not "half-baked."

---

## Current State

### Relevant Existing Structure

| File | Purpose |
|------|---------|
| `app/src/app/brand/page.tsx` (766 lines) | Brand context viewer |
| `app/src/app/competitors/page.tsx` (592 lines) | Competitor search + results |
| `app/src/app/analysis/page.tsx` (574 lines) | Hook analysis + winning patterns |
| `app/src/app/create/page.tsx` (656 lines) | Ad concept generation + display |
| `app/src/app/knowledge/page.tsx` (165 lines) | YouTube knowledge base |
| `app/src/components/meta-ad-card.tsx` (361 lines) | Shared ad card component |

### Gaps Being Addressed

1. **Brand page**: Avatar is 80x80px. Brand description takes full width below it. Products and Visuals galleries are below the fold, collapsed. The entire above-the-fold area is text (colors, style, category cards → visual analysis → keywords → sources).
2. **Competitors page**: Results show only text (advertiser name + badges). Zero thumbnails visible until manually expanding each advertiser. Page looks like a spreadsheet.
3. **Analysis page**: Hook thumbnails forced to `aspect-square` (140px) — vertical 9:16 ads get cropped. Text sections (whyItWorks, hookVisual, videoFirstSeconds) take 80% of each hook card's space. Pattern examples use tiny 14x14 thumbnails.
4. **Create page**: One concept per row means vertical 9:16 images use ~30% of horizontal space. Large empty gaps on either side.
5. **Knowledge page**: Single-column layout with small (w-40) thumbnails. One video per row wastes horizontal space.

---

## Proposed Changes

### Summary of Changes

**Brand Context Page:**
- Move visual gallery above the fold, expanded by default, right below the brand identity card
- Make brand identity card more impactful (larger avatar, brand description condensed to 2 lines with expand)
- Collapse Colors/Style/Category from 3 separate cards into a single compact inline row
- Fold Visual Analysis, Keywords, and Sources by default (collapsed sections)
- Move Products section after visuals, keep collapsed by default

**Find Competitors Page:**
- Show 4-6 ad thumbnail previews inline in each advertiser card (no expansion needed)
- Thumbnails at natural aspect ratio, compact strip layout
- Keep expand/collapse for seeing ALL ads, but first few are always visible

**What's Working Page:**
- Remove `aspect-square` from hook thumbnails — show at natural aspect ratio
- Increase hook thumbnail size from 140px to 180px
- Truncate "Why it works" to 2 lines with expand
- Fold "Visual" description and "First 3-5 seconds" behind a toggle by default
- Pattern example thumbnails: increase from w-14 h-14 to w-20 h-20, natural aspect ratio

**Create Ads Page:**
- Change from 1 concept per row to 2 concepts per row (2-column grid)
- Each concept: reference ad above, generated ad below (vertical stack instead of horizontal)
- This puts 4 images in view per row instead of 2

**Knowledge Base Page:**
- Change from 1-column to 2-column grid layout
- Increase thumbnail size by ~10% (w-40 → w-44)

### Files to Modify

| File Path | Changes |
|-----------|---------|
| `app/src/app/brand/page.tsx` | Restructure layout: visual gallery moved up, text condensed, sections folded |
| `app/src/app/competitors/page.tsx` | Add inline thumbnail previews to advertiser cards |
| `app/src/app/analysis/page.tsx` | Natural aspect ratio thumbnails, larger sizes, text truncation/folding |
| `app/src/app/create/page.tsx` | 2-column concept grid with vertical ad stacking |
| `app/src/app/knowledge/page.tsx` | 2-column grid, larger thumbnails |

### Files to Delete

None.

---

## Design Decisions

### Key Decisions Made

1. **Brand page: Visuals gallery first, not products**: Visuals (brand images from website + Instagram) are more visually compelling than product cards with tiny thumbnails. Moving visuals above the fold creates immediate visual impact. Products stay below since they contain more text metadata.

2. **Brand page: Inline attribute chips instead of 3 separate cards**: Colors, Style, and Category currently consume an entire row of 3 cards. Converting them to a single row of compact labeled chips (e.g., `Colors: Purple, White | Style: Modern minimalist | Category: Hydration`) saves ~200px of vertical space, pushing visuals higher.

3. **Brand page: Description collapsed to 2 lines**: Full brand descriptions can be 4-6 lines. Showing 2 lines with "Show more" keeps the brand identity card compact while still giving context.

4. **Competitors: Always-visible thumbnail strip**: Instead of requiring expansion, showing 4-6 thumbnails inline in each advertiser card provides instant visual proof. This is the single highest-impact change — the page goes from "wall of text" to "gallery of competitor ads."

5. **Analysis: Natural aspect ratio over square crops**: Most ad thumbnails are either 9:16 (video) or 1:1 (static). Forcing them into `aspect-square` crops 9:16 images badly. Using natural ratio with a max-height constraint preserves the creative as designed.

6. **Create page: 2-column grid with vertical stacking**: With vertical 9:16 ads, horizontal side-by-side (reference → generated) wastes space because each tall narrow image leaves gaps. Vertical stacking (reference on top, generated below) within a 2-column grid puts 4 images on screen simultaneously, filling horizontal space.

7. **Knowledge: 2-column grid**: Simple change that doubles visual density. YouTube thumbnails are 16:9 — two per row fills the width naturally.

### Alternatives Considered

- **Brand page: Product images above fold instead of visuals** — Rejected because product thumbnails are small (14x14) inside card layouts with text. Visuals gallery has larger, full-bleed images that create more impact.
- **Competitors: Auto-expand first advertiser** — Rejected because it only solves the problem for #1. Inline thumbnails solve it for ALL advertisers.
- **Create page: 3-column grid** — Rejected because concept cards need room for action buttons, labels, and metadata. Three columns would be too cramped on most screens.
- **Analysis: Remove text entirely from hooks** — Rejected because the hook text and technique are core value. Instead, secondary text (whyItWorks, hookVisual) gets truncated/folded.

---

## Step-by-Step Tasks

### Step 1: Brand Context Page — Visual-First Restructure

Restructure the brand profile view so visuals dominate above the fold.

**Actions:**

1. **Brand Identity Card** — Keep the avatar + brand name section but collapse the description:
   - Description: show max 2 lines (`line-clamp-2`) with a "Show more" toggle
   - Keep URL, Instagram, followers inline as they are (already compact)

2. **Replace 3 attribute cards with a single inline row** — Remove the `grid grid-cols-1 md:grid-cols-3` with separate Cards for Colors, Style, Category. Replace with a single flex row of labeled inline chips directly below the brand identity card:
   ```
   <div className="flex flex-wrap gap-x-6 gap-y-2 px-1">
     {displayColors && <div className="flex items-center gap-1.5"><Palette icon/><span label/><span value/></div>}
     {displayStyle && <div>...</div>}
     {category && <div>...</div>}
   </div>
   ```
   This eliminates 3 cards (~150px height) from above the fold.

3. **Move Visuals Gallery up** — Place the brand visuals gallery immediately after the brand identity card + attributes row. Keep it **expanded by default** (already is). Remove the collapsible toggle — visuals are always shown.

4. **Fold secondary text sections by default** — Visual Analysis, Keywords, and Sources sections become collapsible, **collapsed by default**. Use the existing chevron toggle pattern from Products/Visuals. Group them into a "Details" collapsible section or individual collapsible items.

5. **Products section** — Stays below visuals, collapsed by default (change `productsExpanded` initial state from `true` to `false`).

**New visual hierarchy (top to bottom):**
1. Brand Identity Card (avatar, name, tagline, 2-line description, links)
2. Attribute chips (colors, style, category — one compact row)
3. **Visuals Gallery** (always expanded, high-impact images)
4. Products (collapsed by default)
5. Details section (Visual Analysis, Keywords, Sources — all collapsed by default)

**Files affected:**
- `app/src/app/brand/page.tsx`

---

### Step 2: Find Competitors Page — Inline Thumbnail Previews

Add always-visible thumbnail previews to each advertiser card in results state.

**Actions:**

1. **Modify the advertiser card layout** — After the existing badges row, add a thumbnail strip showing the first 5-6 ads for that advertiser:
   ```
   <div className="flex gap-2 mt-3 overflow-hidden">
     {advAds.slice(0, 6).map((ad) => (
       <div key={ad.id} className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/[0.04]">
         <img src={proxyUrl} className="w-full h-full object-cover" />
       </div>
     ))}
     {advAds.length > 6 && (
       <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-white/[0.04] flex items-center justify-center text-xs text-muted-foreground">
         +{advAds.length - 6}
       </div>
     )}
   </div>
   ```

2. **Image source handling** — For each ad in the preview strip, use the same proxy logic as MetaAdCard:
   - If `ad.localImagePath`: `/api/proxy-image?path=${encodeURIComponent(ad.localImagePath)}`
   - Else if `ad.imageUrl`: `/api/proxy-image?url=${encodeURIComponent(ad.imageUrl)}`

3. **Keep expand/collapse for full grid** — The existing expand behavior remains. Clicking the advertiser card still toggles the full grid view. The inline thumbnails are always visible whether expanded or not.

4. **Visual treatment** — Thumbnails should have subtle hover effects (`hover:ring-1 hover:ring-white/[0.15]`) and video ads should show a small play icon overlay.

**Files affected:**
- `app/src/app/competitors/page.tsx`

---

### Step 3: What's Working Page — Larger Natural-Ratio Thumbnails, Less Text

Make the analysis page more visual-forward with proper aspect ratios and less text clutter.

**Actions:**

1. **Hook thumbnail natural aspect ratio** — In the hook cards, change the thumbnail container from `aspect-square` to natural aspect ratio:
   - Change `md:w-[140px]` to `md:w-[180px]`
   - Remove `aspect-square` from the inner image container
   - Use `aspect-[3/4]` (accommodates both 9:16 and 1:1) with `object-cover` to keep consistent card heights while not cropping as aggressively
   - Image: `w-full h-full object-cover`

2. **Truncate "Why it works"** — Add `line-clamp-2` to the `whyItWorks` paragraph. Add an expand toggle if the text is long enough.

3. **Fold "Visual" and "First 3-5 seconds"** — These two sections are collapsed by default. Add a small "More details" toggle that reveals them. This reduces each hook card's height significantly.

4. **Pattern example thumbnails** — Increase from `w-14 h-14` to `w-20 h-20` and remove the forced `aspect-square` — use `object-cover` with rounded corners at natural proportions. Change container to `w-20 h-20` with `rounded-lg`.

5. **Pattern text truncation** — Add `line-clamp-3` to pattern description text. The hookAnalysis box can remain as-is (it's already compact with its amber styling).

**Files affected:**
- `app/src/app/analysis/page.tsx`

---

### Step 4: Create Ads Page — 2-Column Concept Grid

Show two concepts per row with vertical ad stacking (reference above, generated below).

**Actions:**

1. **Change concept container from single-column to 2-column grid:**
   ```
   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
   ```
   Remove `max-w-5xl mx-auto` — 2-column needs full width.

2. **Restructure each concept card** — Instead of horizontal `lg:flex-row` (reference left, arrow, generated right), stack vertically:
   - Header row (concept #, product, type badge, star) — stays the same
   - Reference ad section: label row + MetaAdCard (showCopy={false})
   - Small downward arrow divider
   - Generated ad section: label row + MetaAdCard (showCopy={false})
   - Action buttons row — stays the same

3. **Change the visual comparison from `flex lg:flex-row` to `flex flex-col`** — Remove the center ArrowRight (or change to ArrowDown). Both images stack vertically within each column.

4. **Adjust max-height** — Since images are now in a narrower column, the `max-h-[320px]` on MetaAdCard may need adjustment. With 2-column grid on a typical 14" MacBook (~1300px content width), each column is ~630px. Vertical 9:16 images at 630px width would be very tall. Cap at `max-h-[400px]` to keep cards manageable.

5. **Responsive fallback** — On smaller screens (`< lg`), fall back to single column (the existing `grid-cols-1`).

**Files affected:**
- `app/src/app/create/page.tsx`

---

### Step 5: Knowledge Base Page — 2-Column Grid with Larger Thumbnails

Double the visual density of the knowledge base.

**Actions:**

1. **Change entry list from `space-y-4` to a 2-column grid:**
   ```
   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
   ```

2. **Increase thumbnail size by ~10%** — Change `w-40` to `w-44` on the thumbnail container. The `aspect-video` class stays (correct 16:9 ratio).

3. **Handle expanded state** — When a knowledge entry is expanded, it should span both columns for readability:
   ```
   <Card className={`... ${expanded === entry.id ? "md:col-span-2" : ""}`}>
   ```
   This ensures the full markdown content has enough width to read comfortably.

**Files affected:**
- `app/src/app/knowledge/page.tsx`

---

### Step 6: Visual QC and Verification

Visually verify all pages with real data to ensure no broken images, layout issues, or regressions.

**Actions:**

1. Start dev server (`npm run dev`)
2. Visit each page and verify:
   - `/brand` — Visuals gallery visible above fold, text sections condensed/folded, no broken images
   - `/competitors` — Thumbnail previews visible on every advertiser card without expanding
   - `/analysis` — Hook thumbnails at natural ratio (no ugly square crops), text properly truncated
   - `/create` — 2-column grid with 4 images visible per row, vertical stacking looks right
   - `/knowledge` — 2-column grid with larger thumbnails, expanded entries span full width
3. Test responsive behavior (resize browser narrow → single column fallback)
4. Check that no existing functionality is broken (video playback, lightbox, expand/collapse, search, generation)

**Files affected:**
- All 5 page files (visual verification only)

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/components/meta-ad-card.tsx` — Used by competitors, analysis, and create pages. **Not modified** — its existing `showCopy={false}` embedded mode and `max-h-[320px]` behavior work well. The create page may need to adjust the max-height by passing it through, or by wrapping the MetaAdCard with a constraining div.
- `app/src/components/app-sidebar.tsx` — Sidebar navigation, not affected.
- API routes — No API changes needed, this is purely frontend layout.

### Updates Needed for Consistency

- `CLAUDE.md` — Update the Brand Page UX section to reflect the new visual-first layout, and add notes about the inline competitor thumbnails, 2-column create grid, and 2-column knowledge grid.

### Impact on Existing Workflows

- No API changes. No data model changes. No routing changes.
- All existing functionality (video playback, lightbox, search, generation, scraping) preserved.
- The only behavioral change is default collapse/expand states on brand page sections.

---

## Validation Checklist

- [ ] Brand page: visuals gallery is visible above the fold without scrolling
- [ ] Brand page: text sections (Visual Analysis, Keywords, Sources) are collapsed by default
- [ ] Brand page: Colors/Style/Category displayed as compact inline chips, not 3 separate cards
- [ ] Competitors page: 4-6 ad thumbnails visible on each advertiser card without expanding
- [ ] Analysis page: hook thumbnails show at natural aspect ratio (not forced square)
- [ ] Analysis page: hook thumbnails are larger (180px wide)
- [ ] Analysis page: "Why it works" text is truncated to 2 lines
- [ ] Create page: concepts displayed in 2-column grid (2 concepts per row)
- [ ] Create page: each concept shows reference + generated stacked vertically
- [ ] Knowledge page: entries displayed in 2-column grid
- [ ] Knowledge page: thumbnails are ~10% larger
- [ ] Knowledge page: expanded entries span full width
- [ ] All pages: no broken images or layout regressions
- [ ] All pages: responsive layout works (single column on narrow screens)
- [ ] CLAUDE.md updated to reflect layout changes

---

## Success Criteria

The implementation is complete when:

1. Every page shows compelling visuals above the fold without scrolling — the first screen is dominated by images, not text.
2. Text-heavy content is either condensed inline (attribute chips), truncated (2-line clamp), or folded (collapsed sections) — never dumped in full at the top.
3. All existing functionality works unchanged — video playback, lightbox, search, generation, data flow.
4. Responsive layouts degrade gracefully to single column on smaller screens.

---

## Notes

- The MetaAdCard component's `max-h-[320px]` in embedded mode (`showCopy={false}`) may need to become configurable if the 2-column create grid makes images too tall or too small. If so, either add a `maxHeight` prop or wrap with a constraining div. Evaluate during implementation.
- The brand page restructure is the most complex change (largest file, most sections to reorganize). The other 4 pages are more surgical.
- The "Details" collapsed section on the brand page could optionally group Visual Analysis + Keywords + Sources under a single toggle, or keep them as 3 individual collapsible items. Individual items are more flexible; a single group is simpler. Decide during implementation based on what looks better.

---

## Implementation Notes

**Implemented:** 2026-05-31

### Summary

All 5 pages redesigned with visual-first layouts. Multiple rounds of iteration with user feedback.

### Final State (after iterations)

- **Brand page**: Visuals gallery always visible above fold. Description clamped to 2 lines. Attribute chips inline. Details collapsed. Products expanded by default.
- **Competitors page**: 3-column advertiser grid (`xl:grid-cols-3`). Each card: compact one-line header + 2-column thumbnail grid at `aspect-[4/5]` (up to 4 large thumbnails). Expanded cards span all 3 columns.
- **Analysis page**: 2-column hook grid (`lg:grid-cols-2`). Thumbnails at `aspect-[3/4]`, 180px wide. Text truncated/folded.
- **Create page**: 2-column concept grid. Reference ad (left) → gradient SVG arrow → generated ad (right), side by side. 4 images visible per row. Arrow is smooth purple gradient SVG with fade-in tail and pointed arrowhead.
- **Knowledge page**: 2-column grid, w-44 thumbnails, expanded entries span full width.

### Deviations from Plan

- Brand page "Details" section: single grouped toggle instead of 3 individual collapses.
- Products: reverted to expanded by default per user feedback (plan said collapsed).
- Competitors: evolved from 2-column to 3-column grid per user feedback. Thumbnail strip replaced with proper 2-column grid of large thumbnails.
- Analysis: added 2-column grid for hook cards (not in original plan).
- Create page: horizontal side-by-side layout (not vertical stacking as originally planned). Added gradient SVG arrow between reference and generated.

### Issues Encountered

- Chrome extension not available for visual QC — verified via build (zero errors), HTTP 200 on all pages, and 33/33 unit tests passing. User verified visually via screenshots.
