# Quality Control (QC) System

## Overview

The QC system prevents bad AI-generated ads from reaching users. It catches wrong products, fabricated claims, weak copy, and generic filler. **QC is invisible to users** — they only see concepts that pass (≥6.0/10).

## Implementation

**File**: `app/src/lib/quality-control.ts`

### When It Runs
After **every** concept is generated, before it's shown to the user.

### Input
```typescript
evaluateCreative(
  concept: AdConcept,           // Generated ad
  brandContext: BrandContext,   // Brand name, description, style, colors
  referenceAd: MetaAdEntry,     // Competitor ad that inspired this
  products?: Product[]          // CRITICAL: Full product catalog
)
```

### Process

#### Step 1: Send to Claude for Evaluation

**Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)

**Prompt Structure**:
```
## Brand Context
Name, description, style, colors

## Brand's Full Product Catalog
- Product 1: name, description
- Product 2: name, description
...

The ad can be about ANY of these products. Do NOT flag a product 
as "wrong category" if it appears in the catalog above.

## Reference Competitor Ad (strategy reference)
Advertiser, primary text, headline, days running

## Generated Concept to Evaluate
Primary text, headline, description, CTA, image prompt, product

Score on 3 dimensions (1-10 each):

1. Brand Consistency (weight 40%):
   - Tone matches brand voice?
   - Product represented accurately?
   - Ad is about the BRAND's product, not competitor's?

2. Copy Quality (weight 35%):
   - Hook compelling?
   - Grammar/persuasion quality?
   - CTA appropriate?
   - Professional, not generic filler?

3. Strategic Relevance (weight 25%):
   - Replicates competitor's winning strategy?
   - Smart adaptation?

FAIL CONDITIONS (score 1-3):
- Ad describes COMPETITOR'S product instead of assigned brand product
- Fabricated claims/ingredients/benefits not true for the product
- Nonsensical or incoherent copy

Scoring guide:
- 1-3: Critical failure
- 4-5: Poor — generic filler, weak hook
- 6-7: Solid — on-brand, competent copy
- 8-9: Strong — compelling hook, great brand match
- 10: Exceptional — could run as-is

Return JSON only:
{
  "brandConsistency": 8,
  "copyQuality": 7,
  "visualRelevance": 8,
  "feedback": "Specific feedback..."
}
```

#### Step 2: Parse Response & Calculate Score

```typescript
const bc = Number(parsed.brandConsistency) || 5;
const cq = Number(parsed.copyQuality) || 5;
const vr = Number(parsed.visualRelevance) || 5;

const overallScore = Math.round(
  (bc * 0.4 + cq * 0.35 + vr * 0.25) * 10
) / 10;
```

**Example**:
```
Brand Consistency: 8
Copy Quality: 7
Visual Relevance: 8

Overall = (8 × 0.4) + (7 × 0.35) + (8 × 0.25)
        = 3.2 + 2.45 + 2.0
        = 7.65/10
```

#### Step 3: Pass/Fail Decision

```typescript
const passed = overallScore >= 6.0;  // Threshold
```

### Retry Logic

If the concept fails (< 6.0):

```typescript
if (!qc.passed) {
  // Stream retry notification to user
  send({
    type: "qc-retry",
    score: qc.overallScore,
    message: `Concept scored ${qc.overallScore}/10 — retrying...`
  });
  
  // Regenerate with QC feedback injected
  const retried = await generateReplicaAdConcept(
    brand,
    product,
    ad,
    knowledgeTactics,
    qc.feedback,  // ← Injected as "PREVIOUS ATTEMPT FEEDBACK"
    adHook
  );
  
  // Regenerate image
  if (retried.imagePrompt) {
    const imageUrl = await generateAdImage(
      retried.imagePrompt,
      referenceUrls,
      { aspectRatio }
    );
    retried.generatedImageUrl = imageUrl;
  }
  
  // Re-evaluate
  const retryQc = await evaluateCreative(
    retried,
    brandContext,
    ad,
    products
  );
  
  // Keep whichever scored higher
  if (retryQc.overallScore > qc.overallScore) {
    concept = retried;
  }
}
```

**Only one retry** — cost control (each retry doubles the cost per concept).

### Output

```typescript
interface QualityScore {
  conceptId: string;
  brandConsistency: number;  // 1-10
  copyQuality: number;       // 1-10
  visualRelevance: number;   // 1-10
  overallScore: number;      // Weighted 0-10
  passed: boolean;           // overallScore >= 6.0
  feedback: string;          // Concise feedback
  evaluatedAt: string;       // ISO timestamp
}
```

## Threshold Calibration: Why 6.0?

### Score Ranges
- **1-3**: Critical failure — wrong product, fabricated claims, nonsense
- **4-5**: Poor — generic filler, weak hook, doesn't match brand voice
- **6-7**: Solid — on-brand, competent copy, adapts strategy reasonably
- **8-9**: Strong — compelling hook, great brand match, smart adaptation
- **10**: Exceptional — could run as-is with no edits (rare)

### Why Not Higher (7.0)?
Too strict. Rejects solid, usable ads. Pass rate drops to 60-70%, forcing excessive retries.

### Why Not Lower (5.0)?
Too loose. Generic filler passes. User sees weak concepts.

### Sweet Spot: 6.0
- Catches real failures (wrong product, fabricated claims)
- Passes competent, on-brand work
- ~90% pass rate after retry
- Balances quality vs. cost

## Why Product Catalog Is Critical

### Without Product Catalog (Old System)
**Scenario**: Brand category is "Hydration", ad is about "Clear Protein"

QC sees:
- Brand: "Hydration"
- Ad: "Clear Protein" (protein product)

QC logic:
> "Brand is Hydration. Ad is about protein. Wrong category!"

**Result**: ❌ FALSE FAILURE (40% of concepts)

### With Product Catalog (Current System)
QC sees:
- Brand: "Hydration & Wellness"
- **Product catalog**:
  - Hydration Mix
  - Energy Drink
  - **Clear Protein** ← REAL PRODUCT
  - Greens Powder

QC logic:
> "Clear Protein is in the catalog. Legitimate brand product. No conflict."

**Result**: ✅ PASS (false positives dropped to near zero)

## Real-World Example

### First Attempt (Failed)
```json
{
  "primaryText": "Our premium whey protein delivers 25g of muscle-building protein in every scoop...",
  "productName": "Clear Protein"
}
```

**QC Scores**:
```
Brand Consistency: 4/10  ← Wrong product form (powder vs liquid)
Copy Quality: 6/10
Strategic Relevance: 7/10

Overall: (4×0.4) + (6×0.35) + (7×0.25) = 5.35/10

FAILED (< 6.0) ❌

Feedback: "Ad describes whey protein POWDER but Clear Protein is a 
clear LIQUID drink. Fix product form. Hook is generic."
```

### Retry (With Feedback Injected)

**Prompt includes**:
```
## PREVIOUS ATTEMPT FEEDBACK
A previous version was rejected. Fix these issues:
"Ad describes whey protein POWDER but Clear Protein is a clear LIQUID 
drink. Fix product form. Hook is generic — use a question hook."

## PRODUCT TO FEATURE
- Name: Clear Protein
- Description: 20g whey isolate in a clear, refreshing liquid (not shake)
...

CRITICAL: Do NOT describe powder, scoops, or shakes.
```

**Second Attempt**:
```json
{
  "primaryText": "Still drinking chalky protein shakes? 😬\n\nBLOOM Clear Protein gives you 20g of pure whey isolate in a light, refreshing drink—not a thick shake...",
  "productName": "Clear Protein"
}
```

**QC Scores**:
```
Brand Consistency: 9/10  ← FIXED (correctly describes liquid)
Copy Quality: 8/10       ← IMPROVED (strong question hook)
Strategic Relevance: 8/10

Overall: (9×0.4) + (8×0.35) + (8×0.25) = 8.4/10

PASSED ✓

Feedback: "Strong question hook, accurate product description, clear 
differentiation."
```

## User-Facing Behavior

### What Users See
- Only concepts with `qcPassed = true` (≥6.0)
- No QC scores displayed
- No QC badges or filters
- Clean, polished concepts only

### What Users Don't See
- Failed concepts (< 6.0)
- QC scores (internal metadata only)
- Retry attempts (happens silently)
- Feedback text (debugging only)

**QC is completely invisible** — users trust that what they see is quality-controlled.

## Performance

**Per Concept**:
- Time: 3-5 seconds
- API calls: 1 Claude Sonnet 4.5 call (max 1024 tokens)
- Cost: ~$0.003

**With Retry** (if failed):
- Time: +40-100 seconds (regenerate copy + image + re-evaluate)
- API calls: +2 Claude calls (1 copy gen, 1 QC eval) + 1 Kie.ai call
- Cost: +$0.016

**Retry Rate**: ~15-20% of concepts
**Pass Rate After Retry**: ~90%

## Related Files

- `app/src/lib/quality-control.ts` — QC evaluation function
- `app/src/app/api/create/batch/route.ts` — Calls QC after concept generation
- `app/src/lib/types.ts` — `QualityScore` interface
- `data/concepts.csv` — Stores `qualityScore`, `qualityFeedback`, `qcPassed` fields

## Design Decisions

### Why Only One Retry?
**Cost control**. Each concept costs:
- Initial: $0.016 (copy + image + QC)
- One retry: $0.032 (2x)
- Two retries: $0.048 (3x)

Diminishing returns — second retry rarely helps. First retry fixes most issues.

### Why Not Show QC Scores?
**User experience**. Scores are internal quality metrics. Users care about:
- Does this ad work for my brand? (yes — it passed)
- Can I use this copy? (yes)

Showing 6.5/10 makes a passing concept feel mediocre. Better to show only quality results.

### Why Use Claude for QC (Not Rules)?
**Nuanced evaluation**. Rule-based QC can't catch:
- Subtle tone mismatches
- Fabricated claims that sound plausible
- Generic filler vs. compelling hooks

Claude understands context, brand voice, and strategic fit.

## Testing

QC system is tested via:
1. **Unit tests** — Type contracts, scoring formula
2. **Integration tests** — Real API calls with known inputs
3. **Manual QA** — Spot-check concepts on /create page

Run: `cd app && npx vitest run`
