# System Flow Diagram — Ads AI Tool

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER WORKFLOW                            │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
              ┌─────▼────┐ ┌────▼────┐ ┌───▼────┐ ┌──────────┐
              │  Step 1  │ │ Step 2  │ │ Step 3 │ │  Step 4  │
              │  Brand   │ │  Find   │ │  What's│ │  Create  │
              │ Context  │ │Competi- │ │Working?│ │   Ads    │
              │          │ │  tors   │ │        │ │          │
              └──────────┘ └─────────┘ └────────┘ └──────────┘


┌─────────────────────────────────────────────────────────────────┐
│              STEP 2: FIND COMPETITORS (DETAILED)                 │
└─────────────────────────────────────────────────────────────────┘

Input: Keywords ["protein powder", "fitness nutrition", "keto supplements"]

    │
    ├──► Apify Meta Ad Library Scraper (parallel batches of 3 keywords)
    │
    ▼
┌─────────────────────┐
│  Raw Ad Data        │  250 ads scraped across all keywords
│  - Advertiser       │
│  - Days Running     │
│  - Primary Text     │
│  - Image URL        │
│  - Video URL        │
│  - Is Active        │
└─────────────────────┘
    │
    ├──► Data Quality Gates (apify.ts)
    │    - hasImage() filter
    │    - isDcoAd() filter (reject {{template vars}})
    │    - Deduplicate by primaryText
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│           COMPETITIVE ANALYSIS ALGORITHM                         │
│                (competitor-scoring.ts)                           │
└─────────────────────────────────────────────────────────────────┘

Step 1: Group by Advertiser
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ BLOOM Nutrition  │  │  Competitor B    │  │  Competitor C    │
│ - ad1 (127 days) │  │ - ad1 (45 days)  │  │ - ad1 (12 days)  │
│ - ad2 (89 days)  │  │ - ad2 (38 days)  │  │ - ad2 (8 days)   │
│ - ad3 (67 days)  │  │ - ad3 (22 days)  │  └──────────────────┘
│ - ad4 (54 days)  │  └──────────────────┘
└──────────────────┘

Step 2: Calculate Metrics Per Advertiser
┌──────────────────────────────────────────┐
│ BLOOM Nutrition                          │
│ - totalAds: 12                           │
│ - activeAds: 8                           │
│ - maxDaysRunning: 127   ←───┐           │
│ - avgDaysRunning: 68        │ Strongest │
│ - creativeDiversity: 9      │ Signals   │
└──────────────────────────────┘           │

Step 3: Score = Weighted Formula
┌────────────────────────────────────────────────────────────┐
│  score = (maxDays × 3) + (avgDays × 2) + (totalAds × 10)  │
│          + (diversity × 5)                                 │
│                                                            │
│  Example:                                                  │
│  (127 × 3) + (68 × 2) + (12 × 10) + (9 × 5) = 1,181      │
│   381      +  136     +    120     +   45   = 1,181      │
│   ────       ────         ────        ──                   │
│   Most       2nd          3rd         4th                  │
│  important  important   important   important              │
└────────────────────────────────────────────────────────────┘

Step 4: Sort Descending by Score
┌────────────────────────────────────────┐
│  Rank 1: BLOOM Nutrition (score 1181) │  ← Best advertiser
│  Rank 2: Competitor B (score 845)     │
│  Rank 3: Competitor C (score 412)     │
└────────────────────────────────────────┘

Output: Ranked list displayed on /competitors page


┌─────────────────────────────────────────────────────────────────┐
│               STEP 4: CREATE ADS (DETAILED)                      │
└─────────────────────────────────────────────────────────────────┘

Input: Generate 10 concepts

    │
    ├──► Dynamic Pairing (batch/route.ts)
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Top 10 Competitor Ads (sorted by daysRunning)                  │
│  × Brand Products (rotate)                                       │
│  = 10 Pairings                                                   │
│                                                                  │
│  [Ad #1 (127d) + Product "Clear Protein"]                       │
│  [Ad #2 (89d)  + Product "Energy Drink"]                        │
│  [Ad #3 (67d)  + Product "Greens Powder"]                       │
│  [Ad #4 (54d)  + Product "Clear Protein"]  ← Rotate            │
│  ...                                                             │
└─────────────────────────────────────────────────────────────────┘
    │
    ├──► Process in Parallel Batches of 3
    │
    ▼

╔═════════════════════════════════════════════════════════════════╗
║              CONCEPT GENERATION PIPELINE                         ║
║                  (per concept, 3 parallel)                       ║
╚═════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│  Step 1: Generate Copy (claude.ts → generateReplicaAdConcept)   │
└─────────────────────────────────────────────────────────────────┘
    Input:
    - Brand: "BLOOM Nutrition"
    - Product: "Clear Protein" (20g protein, zero sugar)
    - Reference Ad: Competitor (127 days, primary text, headline, CTA)
    - Knowledge Tactics: Expert ad patterns from knowledge base
    - Hook Analysis: "Question hook, 'Still paying $X?' technique"
    
    │
    ├──► Claude Sonnet 4.5 API
    │    Prompt: "Replicate STRATEGY (hook type, copy structure, 
    │             emotional angle), write about BLOOM Clear Protein"
    │
    ▼
    Output:
    {
      primaryText: "Still overpaying for protein? 💸\n\nBLOOM Clear...",
      headline: "20G Protein. Zero Sugar.",
      description: "Shop Flavors",
      ctaText: "Shop Now",
      imagePrompt: "Bold white text 'STILL OVERPAYING?' at top...",
      videoScript: "SCENE 1: Person holding competitor bottle...",
      adType: "video",
      ...
    }

┌─────────────────────────────────────────────────────────────────┐
│  Step 2: IMAGE GENERATION FLOW (kie-ai.ts)                      │
└─────────────────────────────────────────────────────────────────┘

2a. Detect Aspect Ratio
    ├──► Read competitor ad image file (data/competitor-ads/bloom/123.png)
    ├──► Parse PNG/JPEG/WebP header
    └──► Detect: 1080×1920 → ratio 1.78 → "9:16"

2b. Call Kie.ai API
    POST /createTask
    Body: {
      model: "nano-banana-pro",
      input: {
        prompt: "Bold white text 'STILL OVERPAYING?' at top...",
        image_input: ["https://meta-cdn.com/competitor.jpg"],  ← Reference
        aspect_ratio: "9:16",
        output_format: "png"
      }
    }
    Response: { taskId: "abc123" }

2c. Poll for Completion (every 3s, max 80 polls = 4min)
    GET /recordInfo?taskId=abc123
    
    Poll 0:  state = "processing"
    Poll 10: state = "processing"
    Poll 20: state = "success" ✓
    
    Result: { resultUrls: ["https://kie-cdn.com/generated.png"] }

2d. Download Locally
    ├──► Fetch https://kie-cdn.com/generated.png
    ├──► Save to data/generated-images/abc123.png
    └──► Return: "/api/proxy-image?path=generated-images/abc123.png"

    concept.generatedImageUrl = "/api/proxy-image?path=..."

┌─────────────────────────────────────────────────────────────────┐
│  Step 3: QUALITY CONTROL SYSTEM (quality-control.ts)            │
└─────────────────────────────────────────────────────────────────┘

3a. First Evaluation
    Input:
    - Concept (generated above)
    - Brand Context (name, description, style, colors)
    - Product Catalog (ALL products — critical for preventing false flags)
    - Reference Ad
    
    │
    ├──► Claude Sonnet 4.5 API (QC Evaluator)
    │    Prompt: "Score on 3 dimensions:
    │             1. Brand Consistency (40%): tone, product accuracy
    │             2. Copy Quality (35%): hook, grammar, CTA
    │             3. Strategic Relevance (25%): replicates strategy?"
    │
    ▼
    Response:
    {
      brandConsistency: 7,
      copyQuality: 5,    ← LOW (weak hook)
      visualRelevance: 8,
      feedback: "Hook lacks specificity. Generic '$X' placeholder."
    }
    
    Overall Score: (7×0.4) + (5×0.35) + (8×0.25) = 6.55/10
    
    Threshold Check: 6.55 >= 6.0 → PASS ✓

3b. IF FAILED (< 6.0) → Retry Once
    │
    ├──► Inject QC feedback into prompt
    │    "PREVIOUS ATTEMPT FEEDBACK: Hook lacks specificity..."
    │
    ├──► Re-generate copy with feedback
    │
    ├──► Re-generate image
    │
    ├──► Re-evaluate QC
    │
    └──► Keep whichever scored higher (original vs. retry)

3c. Final Output
    concept.qualityScore = 6.55
    concept.qcPassed = true
    concept.qualityFeedback = "Hook lacks specificity..."

┌─────────────────────────────────────────────────────────────────┐
│  Step 4: Stream to User via SSE                                  │
└─────────────────────────────────────────────────────────────────┘
    
    ├──► Only concepts with qcPassed = true are shown
    │
    └──► User sees:
         - Side-by-side comparison (competitor → generated)
         - Glass buttons: "Copy", "Video Script", "Strategy"
         - No QC scores visible (internal only)

╔═════════════════════════════════════════════════════════════════╗
║                       END OF PIPELINE                            ║
╚═════════════════════════════════════════════════════════════════╝

Next batch of 3 concepts starts...


┌─────────────────────────────────────────────────────────────────┐
│                  TIMING BREAKDOWN (Per Concept)                  │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────┬──────────┬─────────┬─────────┐
│ Step                   │ Time     │ Cost    │ API     │
├────────────────────────┼──────────┼─────────┼─────────┤
│ Generate Copy          │ 3-5s     │ $0.003  │ Claude  │
│ Generate Image         │ 30-90s   │ $0.01   │ Kie.ai  │
│ QC Evaluation          │ 3-5s     │ $0.003  │ Claude  │
│ (Retry if failed)      │ +40-100s │ +$0.016 │ Both    │
├────────────────────────┼──────────┼─────────┼─────────┤
│ Total (no retry)       │ 36-100s  │ $0.016  │         │
│ Total (with retry)     │ 76-200s  │ $0.032  │         │
└────────────────────────┴──────────┴─────────┴─────────┘

Parallelization:
- 10 concepts in batches of 3
- Batch 1: Concepts 1-3   (parallel, ~1-2 min)
- Batch 2: Concepts 4-6   (parallel, ~1-2 min)
- Batch 3: Concepts 7-9   (parallel, ~1-2 min)
- Batch 4: Concept 10     (single,   ~1-2 min)

Total Time: ~4-8 minutes for 10 concepts
Total Cost: ~$0.16-$0.32 (depends on retry rate)


┌─────────────────────────────────────────────────────────────────┐
│                   KEY DESIGN INSIGHTS                            │
└─────────────────────────────────────────────────────────────────┘

1. WHY COMPETITIVE SCORING WEIGHTS DAYS RUNNING 3X
   ┌────────────────────────────────────────────────┐
   │ Days Running = Direct ROI Signal               │
   │                                                │
   │ If unprofitable → turned off within 7 days    │
   │ If profitable  → runs 60-120+ days            │
   │                                                │
   │ This is THE strongest predictor of what works │
   └────────────────────────────────────────────────┘

2. WHY QC THRESHOLD IS 6.0/10
   ┌─────────────┬──────────────────────────────────┐
   │   < 4.0     │ Nonsense, wrong product          │
   │   4.0-5.9   │ Generic filler, weak hooks       │
   │ ► 6.0-7.0   │ SOLID — usable ads ✓             │
   │   7.0-9.0   │ Strong ads                       │
   │   9.0+      │ Exceptional (rare)               │
   └─────────────┴──────────────────────────────────┘
   
   Too strict (7.0) → rejects solid work
   Too loose (5.0)  → generic filler passes
   Sweet spot: 6.0  → catches failures, passes competent work

3. WHY ONLY ONE RETRY
   ┌────────────────────────────────────────────────┐
   │ Cost Per Concept:                              │
   │ - No retry:   $0.016                           │
   │ - One retry:  $0.032  (2x)                     │
   │ - Two retries: $0.048  (3x) ← Too expensive   │
   │                                                │
   │ Diminishing returns: 2nd retry rarely helps   │
   └────────────────────────────────────────────────┘

4. WHY PASS PRODUCT CATALOG TO QC
   ┌────────────────────────────────────────────────┐
   │ Without Catalog:                               │
   │ ✗ QC sees brand category: "Hydration"         │
   │ ✗ Concept is about "Clear Protein"            │
   │ ✗ QC flags: "Wrong category" ← FALSE POSITIVE │
   │                                                │
   │ With Catalog:                                  │
   │ ✓ QC sees all products: Clear Protein, Energy,│
   │   Greens, Hydration Mix                       │
   │ ✓ Knows "Clear Protein" is legitimate         │
   │ ✓ No false flags ✓                            │
   └────────────────────────────────────────────────┘

5. WHY DETECT ASPECT RATIO FROM COMPETITOR AD
   ┌────────────────────────────────────────────────┐
   │ Match the format that's PROVEN to work:       │
   │                                                │
   │ If competitor runs 9:16 for 90 days           │
   │ → Generate 9:16 (don't guess 1:1)            │
   │                                                │
   │ Format is part of the winning strategy        │
   └────────────────────────────────────────────────┘
