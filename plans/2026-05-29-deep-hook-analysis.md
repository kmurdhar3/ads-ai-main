# Plan: Deep Hook Analysis System

**Created:** 2026-05-29
**Status:** Implemented
**Request:** Build a deep hook analysis system that extracts, stores, and displays hooks from competitor ads — the most important element in advertising.

---

## Overview

### What This Plan Accomplishes

Adds a dedicated hook analysis layer to the competitor ad pipeline. Every competitor ad gets a structured hook breakdown: what grabs attention in the first 3-5 seconds (video) or the punchiest visual/text element (static). This data is stored per-ad, displayed prominently in the "What's Working" analysis, and fed into concept generation so our generated ads have stronger hooks.

### Why This Matters

As David Ogilvy said: "When you wrote your title, you spent 80% of your advertising dollar." The hook is the single most important element of any ad. Currently, the analysis identifies `hookType` as a one-word label ("question", "bold claim") per pattern — but doesn't deeply analyze what each ad's hook actually IS: the exact words, the visual composition, the emotional trigger, the pacing. Professional marketers need to see the actual hooks that are winning, not just category labels.

---

## Current State

### Relevant Existing Structure

| File | Role |
|------|------|
| `app/src/lib/types.ts:70-81` | `WinningPattern` — has `hookType: string` (just a label like "question") |
| `app/src/lib/types.ts:83-88` | `AnalysisResult` — `patterns[]` + `summary` |
| `app/src/lib/types.ts:140-156` | `MetaAdEntry` — has `primaryText`, `headline`, `videoUrl`, `imageUrl`, `localImagePath` |
| `app/src/lib/claude.ts:505-587` | `analyzeWinningPatterns()` — sends top 40 ads to Claude, gets 5-8 patterns |
| `app/src/lib/claude.ts:192-369` | `generateReplicaAdConcept()` — prompt says "replicate HOOK TYPE" but only gets a label |
| `app/src/app/analysis/page.tsx` | "What's Working" page — shows patterns in a grid |
| `app/src/app/api/analysis/route.ts` | Analysis API — GET cached / POST run new |
| `data/analysis.json` | Stored analysis result |

### Gaps Being Addressed

1. **Hook analysis is shallow** — `hookType: "question"` tells you the category but not the actual hook. "Is your skin aging faster than you think?" vs "Did you know?" are both "question" hooks but worlds apart in effectiveness.
2. **No per-ad hook data** — hooks are only stored at the pattern level. You can't browse individual ad hooks.
3. **No visual hook analysis** — for static ads, the hook is often a visual element (bold text overlay, striking image, color contrast). The system only analyzes copy.
4. **Generation prompt doesn't get hook detail** — `generateReplicaAdConcept()` tells Claude "replicate the hook type" but doesn't show what specifically made the reference ad's hook work.
5. **No hook-focused display** — the analysis page treats hooks as one of five equal dimensions. Hooks should be front and center.

---

## Proposed Changes

### Summary of Changes

- Add `HookAnalysis` type with structured fields for hook text, visual description, technique, and effectiveness rating
- Add per-ad hook analysis to the `analyzeWinningPatterns()` prompt — Claude extracts the actual hook from each of the top 40 ads
- Store hook data in `analysis.json` alongside patterns (new `hooks` field on `AnalysisResult`)
- Add a dedicated **Hooks section** to the "What's Working" page — displayed FIRST, before patterns
- Feed hook analysis into `generateReplicaAdConcept()` so generated concepts have stronger, more specific hooks
- Add unit tests for the new types and data contracts

### New Files to Create

None — all changes are modifications to existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `app/src/lib/types.ts` | Add `HookAnalysis` interface, add `hooks` field to `AnalysisResult`, add `hookAnalysis` to `WinningPattern` |
| `app/src/lib/claude.ts` | Rewrite `analyzeWinningPatterns()` prompt to extract deep hook data per ad. Update `generateReplicaAdConcept()` to use hook analysis. |
| `app/src/app/analysis/page.tsx` | Add hooks section at top of results. Display hook cards with thumbnails. |
| `app/src/app/api/analysis/route.ts` | No structural changes — it already passes through the full AnalysisResult |
| `app/src/lib/csv.ts` | No changes — `writeAnalysis`/`readAnalysis` already serialize full JSON |
| `app/src/__tests__/types.test.ts` | Add type contract tests for HookAnalysis |

---

## Design Decisions

### Key Decisions

1. **Per-ad hooks stored on AnalysisResult, not on MetaAdEntry**: Hook analysis requires Claude interpretation. Storing it on the analysis result (not the raw ad data) keeps the scraping layer clean and the analysis layer intelligent. Re-running analysis regenerates hooks.

2. **Hook analysis in the same Claude call as pattern analysis**: One call analyzes both patterns and per-ad hooks. This is more efficient than a separate call per ad (would be 40 API calls). Claude sees all ads at once and can compare hooks.

3. **Top 15 hooks displayed, all 40 analyzed**: Claude analyzes hooks for all 40 top ads, but the UI shows only the top 15 ranked by effectiveness. This keeps the page focused while the generation prompt can use any of the 40.

4. **Hooks section FIRST on the analysis page**: Above patterns, above summary. This reflects the Ogilvy principle — hooks are 80% of the ad's value and should get 80% of the attention.

5. **Hook data flows into generation**: The `generateReplicaAdConcept()` prompt gets the reference ad's specific hook analysis, not just a category label. This means generated hooks are modeled on what specifically worked, not a generic "use a question hook."

### Alternatives Considered

- **Gemini vision analysis of ad images for visual hooks**: Would give richer visual hook data but adds latency, cost, and API dependency. The current approach uses Claude to infer visual approach from the ad's text + context. Can be added later.
- **Separate API call per ad for hooks**: More detailed per-ad but 40x more API calls. Rejected for cost/speed.
- **Store hooks on MetaAdEntry in CSV**: Would require re-scraping or a migration. Analysis-time generation is cleaner.

---

## Step-by-Step Tasks

### Step 1: Add HookAnalysis Types

Add the `HookAnalysis` interface and update `AnalysisResult` and `WinningPattern`.

**Actions:**

- Add `HookAnalysis` interface to `types.ts`:
  ```typescript
  export interface HookAnalysis {
    adId: string;
    advertiser: string;
    hookText: string;        // The exact opening words/sentence that grab attention
    hookTechnique: string;   // Specific technique: "provocative question", "shocking stat", "before/after contrast", "social proof number", "pattern interrupt", "direct address", "curiosity gap", etc.
    hookVisual: string;      // What the viewer SEES: text overlay, image composition, color, movement (for video: first 3 seconds)
    whyItWorks: string;      // 1-2 sentences on the psychology — why this stops the scroll
    effectiveness: number;   // 1-10 rating based on ad longevity and hook quality
    isVideo: boolean;        // Whether this is a video ad hook
    videoFirstSeconds?: string; // For video: what happens in the first 3-5 seconds (visual + audio + text)
  }
  ```
- Add `hooks: HookAnalysis[]` to `AnalysisResult`
- Add `hookAnalysis?: string` to `WinningPattern` (a paragraph-level hook analysis for the pattern)

**Files affected:**
- `app/src/lib/types.ts`

---

### Step 2: Rewrite analyzeWinningPatterns() Prompt

Update the Claude prompt to extract deep hook analysis per ad alongside patterns.

**Actions:**

- In `analyzeWinningPatterns()` in `claude.ts`, add a `hooks` array to the requested JSON output
- The prompt should instruct Claude to analyze each of the top ads and extract:
  - The exact hook text (first sentence or attention-grabbing element)
  - The technique used (be specific — not just "question" but "provocative rhetorical question that challenges a common belief")
  - The visual hook (what the viewer sees — text overlay style, image composition, color contrast, movement)
  - Why it works psychologically
  - Effectiveness rating (1-10) based on days running and hook quality
  - For video ads: describe exactly what happens in the first 3-5 seconds
- Add a `hookAnalysis` field to each pattern in the prompt output — a paragraph explaining what hook strategies this pattern uses and why they work
- Mark each ad summary with `[VIDEO]` or `[STATIC]` tag so Claude knows the format
- Increase `max_tokens` from 4096 to 8192 to accommodate the additional hook data

**Files affected:**
- `app/src/lib/claude.ts`

---

### Step 3: Update generateReplicaAdConcept() to Use Hook Data

Feed the reference ad's specific hook analysis into the generation prompt.

**Actions:**

- Add optional `hookAnalysis?: HookAnalysis` parameter to `generateReplicaAdConcept()`
- In the prompt, add a new section before the replication instructions:
  ```
  ## HOOK ANALYSIS (CRITICAL — THIS IS 80% OF THE AD)
  The reference ad's hook works because: {whyItWorks}
  Hook technique: {hookTechnique}
  Exact hook text: "{hookText}"
  Visual hook: {hookVisual}
  {If video: "First 3-5 seconds: {videoFirstSeconds}"}
  
  Your ad's hook MUST:
  1. Use the same technique ({hookTechnique})
  2. Match the intensity and specificity of the original
  3. Adapt it for {product} — don't copy word-for-word, but replicate the psychological mechanism
  ```
- In the batch route, look up the hook analysis for the reference ad and pass it through

**Files affected:**
- `app/src/lib/claude.ts`
- `app/src/app/api/create/batch/route.ts`

---

### Step 4: Redesign Analysis Page — Hooks Section

Add a prominent hooks section at the top of the "What's Working" results.

**Actions:**

- Add a "Top Hooks" section that renders FIRST, before patterns and summary
- Display the top 15 hooks (sorted by effectiveness) as compact cards:
  - Left: ad thumbnail (clickable — lightbox for image, video player for video)
  - Right: hook text in large, bold font (the actual words). Below: technique badge, "Video"/"Static" badge, days running, advertiser name. Below that: "Why it works" in smaller muted text.
- Use glass-morphism card styling consistent with the rest of the app
- Video hooks get a special "First 3-5 seconds" subsection showing what happens visually
- Each hook card has a subtle "Ad Library ↗" link in the label row (same pattern as create page)
- Pattern cards get an additional "Hook Analysis" paragraph shown below the existing 5-column grid

**Files affected:**
- `app/src/app/analysis/page.tsx`

---

### Step 5: Update Batch Route to Pass Hook Data

Wire the hook analysis into the concept generation pipeline.

**Actions:**

- In `batch/route.ts`, after reading the analysis, build a map of `adId → HookAnalysis`
- When generating each concept, look up the reference ad's hook from the map
- Pass it to `generateReplicaAdConcept()` as the new `hookAnalysis` parameter

**Files affected:**
- `app/src/app/api/create/batch/route.ts`

---

### Step 6: Add Unit Tests

Add type contract tests for the new hook analysis data.

**Actions:**

- In the existing test file, add tests that verify:
  - `HookAnalysis` fields are present on a sample analysis result
  - `hooks` array exists on `AnalysisResult`
  - Hook effectiveness rating is 1-10
  - `hookAnalysis` string exists on patterns
  - Backward compatibility: analysis without hooks still loads

**Files affected:**
- `app/src/__tests__/types.test.ts` or new test file

---

### Step 7: Run Real Analysis and Validate

Run the analysis on real competitor ad data and validate quality.

**Actions:**

- Start dev server, navigate to `/analysis`, run a new analysis
- Verify: hooks array populated with 15+ entries
- Verify: each hook has meaningful `hookText` (not generic), specific `hookTechnique`, `hookVisual` description
- Verify: video ads have `videoFirstSeconds` populated
- Verify: effectiveness ratings correlate with days running
- Verify: patterns include `hookAnalysis` paragraph
- Verify: hooks display correctly on the page with thumbnails
- Verify: re-running concept generation produces concepts with stronger, more specific hooks
- Check the generated analysis.json to confirm data structure

---

### Step 8: Update CLAUDE.md

Document the new hook analysis system.

**Actions:**

- Update the "What's Working" Analysis section to mention hook analysis
- Update the Ad Concept Generation Flow to mention hook data in generation
- Update the AnalysisResult type documentation
- Add hook analysis to the UX Standards (hooks displayed first)

**Files affected:**
- `CLAUDE.md`
- `context/strategy.md`

---

## Connections & Dependencies

### Files That Reference This Area

- `app/src/app/create/page.tsx` — reads concepts (no changes needed)
- `app/src/lib/csv.ts` — `writeAnalysis()`/`readAnalysis()` serialize full JSON objects (no changes needed — new fields automatically included)
- `data/analysis.json` — will get new `hooks` field

### Updates Needed for Consistency

- CLAUDE.md documentation for analysis types and flow
- context/strategy.md for completed work tracking

### Impact on Existing Workflows

- Analysis takes slightly longer (more data extracted) but is still a single Claude call
- Existing patterns continue to work unchanged — hooks are additive
- Old `analysis.json` files without `hooks` field will work fine (hooks default to `[]`)
- Concept generation is improved but the function signature is backward-compatible (hookAnalysis is optional)

---

## Validation Checklist

- [ ] `HookAnalysis` interface exists in types.ts with all fields
- [ ] `AnalysisResult` has `hooks: HookAnalysis[]` field
- [ ] `WinningPattern` has `hookAnalysis?: string` field
- [ ] `analyzeWinningPatterns()` prompt requests hook data per ad
- [ ] `generateReplicaAdConcept()` accepts and uses hook analysis
- [ ] Batch route passes hook data to generation
- [ ] Analysis page shows hooks section FIRST
- [ ] Hook cards display: thumbnail, hook text (bold), technique, why it works
- [ ] Video hooks show "First 3-5 seconds" detail
- [ ] Unit tests pass for new types
- [ ] Real analysis run produces meaningful hook data
- [ ] CLAUDE.md updated

---

## Success Criteria

1. Running analysis on real competitor ads produces structured hook data for all 40 analyzed ads, with specific hook text (not generic labels), technique descriptions, visual analysis, and effectiveness ratings
2. The "What's Working" page shows hooks as the FIRST and most prominent section, with each hook displaying the actual attention-grabbing text/visual in bold alongside the ad thumbnail
3. Generated ad concepts have measurably more specific hooks because the generation prompt receives the reference ad's detailed hook analysis, not just a category label
4. All 30 existing unit tests pass plus new hook type contract tests

---

## Notes

- Future enhancement: Gemini vision analysis of ad images could provide richer visual hook data (what colors, what text overlays, what composition). Current approach uses Claude's inference from text + context.
- Future enhancement: Video frame extraction (ffmpeg) could pull actual thumbnail of first 3 seconds. Current approach describes it textually.
- Reduced to 25 ads and 16384 max_tokens after 8192 tokens caused truncation with 40 ads.

---

## Implementation Notes

**Implemented:** 2026-05-29

### Summary

All 8 steps executed. Deep hook analysis system is live. Real analysis on 25 competitor ads produced 24 hooks (15 video with first-3-5-seconds data, 9 static) and 8 patterns with hookAnalysis paragraphs. Hooks display first on the analysis page. Hook data flows into concept generation.

### Deviations from Plan

- Reduced from 40 to 25 ads analyzed — 40 ads × deep hook analysis exceeded 8192 token limit, causing JSON parse failures. 25 ads with 16384 max_tokens works reliably.
- Trimmed ad summaries (removed Description/Platforms fields, reduced primaryText to 300 chars) to fit within input limits.
- Added error logging (stop_reason, response length, first 500 chars) to the parse catch block for debugging future truncation issues.

### Issues Encountered

- First real analysis run failed (0 hooks, 0 patterns) — Claude's response was truncated at 8192 tokens. Fixed by increasing max_tokens to 16384 and reducing input ads from 40 to 25.
