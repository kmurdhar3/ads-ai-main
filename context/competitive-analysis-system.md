# Competitive Analysis System

## Overview

The competitive analysis algorithm ranks Meta Ad Library advertisers by profitability signals. The core insight: **if an ad runs for 60+ days, it's making money**. This system surfaces proven winners, not just high-volume advertisers.

## Implementation

**File**: `app/src/lib/competitor-scoring.ts`

### Input
Array of Meta Ad Library entries with fields:
- `advertiser` — company name
- `daysRunning` — how long the ad has been active
- `isActive` — currently running or paused
- `primaryText` — ad copy (first 100 chars used for deduplication)
- `id` — Meta archive ID

### Algorithm Steps

#### 1. Group Ads by Advertiser
```typescript
const groups = new Map<string, MetaAdEntry[]>();
for (const ad of ads) {
  const name = ad.advertiser;
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name)!.push(ad);
}
```

#### 2. Calculate Metrics Per Advertiser
For each advertiser group:

```typescript
const totalAds = advAds.length;
const activeAds = advAds.filter((a) => a.isActive).length;
const maxDaysRunning = Math.max(...daysValues);
const avgDaysRunning = Math.round(sum / count);
```

**Creative Diversity** (unique variations):
```typescript
const seen = new Set<string>();
for (const ad of advAds) {
  const key = ad.primaryText.slice(0, 100).trim();
  if (key) seen.add(key);
}
const creativeDiversity = seen.size;
```

#### 3. Score with Weighted Formula
```typescript
const score =
  (maxDaysRunning * 3) +      // 3x weight — longest ad is biggest signal
  (avgDaysRunning * 2) +      // 2x weight — consistency matters
  (totalAds * 10) +           // 10x weight — volume = serious budget
  (creativeDiversity * 5);    // 5x weight — testing sophistication
```

#### 4. Sort by Score (Descending)
```typescript
scored.sort((a, b) => b.score - a.score);
```

## Scoring Formula Rationale

### Why Weight Days Running 3x?
**Days running is the proxy for profitability.** Direct-response ads on Meta are ruthlessly ROI-driven. If an ad isn't profitable, it gets turned off within 7 days. An ad running 60-120+ days is almost certainly making money.

### Why Weight Total Ads 10x?
**Volume indicates serious budget.** An advertiser running 12+ ads is spending significant money. They're not testing — they're scaling proven winners.

### Why Weight Creative Diversity 5x?
**Variety indicates testing sophistication.** Advertisers running the same ad repeatedly are less sophisticated than those testing 8-10 unique variations. Diversity shows they're actively optimizing.

### Example Calculation
**BLOOM Nutrition**:
- Max days running: 127
- Avg days running: 68
- Total ads: 12
- Creative diversity: 9

```
Score = (127 × 3) + (68 × 2) + (12 × 10) + (9 × 5)
      = 381 + 136 + 120 + 45
      = 1,181 points
```

**Competitor B**:
- Max days running: 45
- Avg days running: 32
- Total ads: 7
- Creative diversity: 5

```
Score = (45 × 3) + (32 × 2) + (7 × 10) + (5 × 5)
      = 135 + 64 + 70 + 25
      = 294 points
```

**BLOOM ranks higher** (1,181 vs 294) because their longest ad ran **127 days** vs 45 days.

## Output Format

```typescript
interface ScoredAdvertiser {
  name: string;              // "BLOOM Nutrition"
  totalAds: number;          // 12
  activeAds: number;         // 8
  maxDaysRunning: number;    // 127
  avgDaysRunning: number;    // 68
  creativeDiversity: number; // 9
  score: number;             // 1181
  adIds: string[];           // Meta archive IDs
}
```

## Usage in App

**Step 2: Find Competitors** (`/competitors` page)
1. User searches keywords: `["protein powder", "keto supplements"]`
2. Apify scrapes Meta Ad Library → 250 ads
3. `scoreAdvertisers()` groups, calculates, scores, sorts
4. UI displays ranked list with top advertiser first
5. Each advertiser card shows:
   - Rank, name, score
   - `maxDaysRunning` badge (e.g., "127d" in amber if 30+ days)
   - Total ads, active ads
   - Up to 4 ad thumbnails in expandable grid

**Step 4: Create Ads** (`/create` page)
1. Concepts are paired with top ads (sorted by `daysRunning`)
2. Ad that ran 127 days is used first (strongest signal)
3. Each concept's `inspirationAdIds` references the source Meta ad ID

## Performance

- **Time**: ~5ms (in-memory sorting, no API calls)
- **Cost**: $0
- **Scalability**: Handles 1,000+ ads easily

## Edge Cases Handled

1. **Zero ads**: Returns empty array
2. **Single advertiser**: Returns array with 1 entry
3. **Ties in score**: Maintains original order (stable sort)
4. **Missing `daysRunning`**: Filters out (`d > 0` check)
5. **Empty `primaryText`**: Skips in diversity calculation

## Related Files

- `app/src/lib/competitor-scoring.ts` — Algorithm implementation
- `app/src/app/api/search/route.ts` — Called after Meta Ad Library scrape
- `app/src/app/competitors/page.tsx` — UI display of ranked advertisers
- `data/search-results.json` — Persisted scored advertisers

## Testing

Unit tests in `app/src/lib/competitor-scoring.test.ts` (via Vitest):
- Empty input
- Single advertiser
- Multiple advertisers with varying metrics
- Score tie-breaking
- Creative diversity deduplication

Run: `cd app && npx vitest run`
