# Core System Breakdown — Ads AI Tool

## 1. Competitive Analysis Algorithm

### Purpose
Rank advertisers by "profitability signals" — the longer an ad runs, the more profitable it likely is.

### Input
- Array of Meta Ad Library entries (scraped competitor ads)
- Each ad has: `advertiser`, `daysRunning`, `isActive`, `primaryText`, `id`

### Process

#### Step 1: Group Ads by Advertiser
```typescript
const groups = new Map<string, MetaAdEntry[]>();
for (const ad of ads) {
  const name = ad.advertiser;
  if (!groups.has(name)) groups.set(name, []);
  groups.get(name)!.push(ad);
}
```
**Result**: All ads grouped by advertiser name (e.g., "BLOOM Nutrition" → [ad1, ad2, ad3...])

#### Step 2: Calculate Metrics Per Advertiser
For each advertiser group:

```typescript
const totalAds = advAds.length;  // How many ads they're running
const activeAds = advAds.filter((a) => a.isActive).length;  // Currently active
const maxDaysRunning = Math.max(...daysValues);  // Longest-running ad
const avgDaysRunning = Math.round(sum / count);  // Average longevity
```

**Creative Diversity** (unique ad variations):
```typescript
const seen = new Set<string>();
for (const ad of advAds) {
  const key = ad.primaryText.slice(0, 100).trim();  // First 100 chars as fingerprint
  if (key) seen.add(key);
}
const creativeDiversity = seen.size;  // Number of unique variations
```

#### Step 3: Calculate Composite Score
Weighted formula — **days running matters most**:

```typescript
const score =
  (maxDaysRunning * 3) +      // 3x weight — longest ad is biggest signal
  (avgDaysRunning * 2) +      // 2x weight — consistency matters
  (totalAds * 10) +           // 10x weight — volume = serious budget
  (creativeDiversity * 5);    // 5x weight — testing sophistication
```

**Why This Formula?**
- **maxDaysRunning × 3**: An ad running 60+ days is almost certainly profitable. This is the #1 signal.
- **avgDaysRunning × 2**: Consistent performance across multiple ads.
- **totalAds × 10**: More ads = bigger budget = serious advertiser.
- **creativeDiversity × 5**: More variations = sophisticated testing strategy.

#### Step 4: Sort & Return
```typescript
scored.sort((a, b) => b.score - a.score);  // Highest score first
```

### Output Example
```json
[
  {
    "name": "BLOOM Nutrition",
    "totalAds": 12,
    "activeAds": 8,
    "maxDaysRunning": 127,
    "avgDaysRunning": 68,
    "creativeDiversity": 9,
    "score": 1181,  // (127×3) + (68×2) + (12×10) + (9×5)
    "adIds": ["123", "456", ...]
  },
  {
    "name": "Competitor B",
    "score": 845,
    ...
  }
]
```

### Key Insight
**Days running is the proxy for profit** — if an advertiser keeps paying to run the same ad for 60+ days, it's making money. The algorithm surfaces these proven winners first.

---

## 2. Quality Control (QC) Scoring System

### Purpose
Prevent bad AI-generated ads from reaching the user — catch wrong products, fabricated claims, weak copy.

### When It Runs
After **every** concept is generated, before showing it to the user.

### Input
- Generated ad concept (headline, body, CTA, image prompt, product)
- Brand context (name, description, style, colors)
- Full product catalog (critical!)
- Reference competitor ad

### Process

#### Step 1: Send to Claude for Evaluation
The QC prompt is sent to Claude Sonnet 4.5 with three scoring dimensions:

```
1. Brand Consistency (40% weight)
   - Tone matches brand voice?
   - Product represented accurately?
   - Ad is about the BRAND's product, not competitor's?

2. Copy Quality (35% weight)
   - Hook compelling?
   - Grammar/persuasion quality?
   - CTA appropriate?
   - Professional (not generic filler)?

3. Strategic Relevance (25% weight)
   - Replicates competitor's winning strategy?
   - Smart adaptation?
```

**Critical Context Provided**:
```typescript
## Brand's Full Product Catalog
- Clear Protein: 20g protein, zero sugar, keto-friendly
- Energy Drink: Natural caffeine, B vitamins
- Greens Powder: 30 superfoods, gut health blend

The ad can be about ANY of these products. Do NOT flag a product 
as "wrong category" if it appears in the catalog above.
```

**Why Product Catalog Matters**:
Without it, QC reads the brand's `category: "Hydration"` and falsely flags "Clear Protein" as wrong category. The catalog tells QC which products are legitimate.

#### Step 2: Parse Response
```typescript
{
  "brandConsistency": 8,
  "copyQuality": 7,
  "visualRelevance": 8,
  "feedback": "Strong hook replicating the question format. Product 
               claims match the catalog. Minor: CTA could be more specific."
}
```

#### Step 3: Calculate Weighted Score
```typescript
const overallScore = 
  (brandConsistency * 0.4) + 
  (copyQuality * 0.35) + 
  (visualRelevance * 0.25);

// Example: (8 × 0.4) + (7 × 0.35) + (8 × 0.25) = 7.65
```

#### Step 4: Pass/Fail Decision
```typescript
const passed = overallScore >= 6.0;  // Threshold
```

**Threshold Calibration**:
- **< 6.0**: Critical failures (wrong product, fabricated claims, nonsense)
- **6.0 - 7.0**: Solid, usable ads
- **7.0 - 9.0**: Strong ads
- **9.0+**: Exceptional (rare)

### Retry Logic (One Retry Only)
If the concept fails (< 6.0):

```typescript
if (!qc.passed) {
  // Regenerate with QC feedback injected into prompt
  const retried = await generateReplicaAdConcept(
    brand, product, ad, knowledgeTactics,
    qc.feedback,  // ← Injected as "PREVIOUS ATTEMPT FEEDBACK" section
    adHook
  );
  
  // Re-score
  const retryQc = await evaluateCreative(retried, brandContext, ad, products);
  
  // Keep whichever scored higher
  if (retryQc.overallScore > qc.overallScore) {
    concept = retried;
  }
}
```

### Output
```typescript
{
  conceptId: "concept-123",
  brandConsistency: 8,
  copyQuality: 7,
  visualRelevance: 8,
  overallScore: 7.65,
  passed: true,  // ← Only concepts with passed=true are shown to user
  feedback: "Strong hook...",
  evaluatedAt: "2026-07-10T..."
}
```

### User-Facing Result
**QC is invisible** — users only see concepts that passed (≥6.0). No scores, no badges, no filters. Failed concepts never reach the UI.

---

## 3. Image Generation Flow

### Purpose
Generate AI images that replicate the competitor ad's visual style but feature the brand's product.

### Service Used
**Kie.ai** — "Nano Banana Pro" model (AI image generation with reference image support)

### Input
- `imagePrompt` — detailed description of the image to generate
- `referenceImageUrls` — competitor ad's image URL(s) (up to 8)
- `aspectRatio` — "1:1", "4:5", or "9:16" (detected from competitor ad)

### Process

#### Step 1: Detect Aspect Ratio
Reads the **downloaded competitor ad image** (PNG/JPEG/WebP) and parses dimensions from the file header:

```typescript
function detectAspectRatio(ad: MetaAdEntry): "1:1" | "9:16" | "4:5" {
  const buf = fs.readFileSync(ad.localImagePath);
  const dims = getImageDimensions(buf);  // Parse PNG/JPEG/WebP headers
  
  const ratio = dims.height / dims.width;
  
  if (ratio > 1.4) return "9:16";  // Vertical video (1080×1920)
  if (ratio > 1.1) return "4:5";   // Instagram feed (1080×1350)
  return "1:1";                    // Square (1080×1080)
}
```

**Why Parse Headers?**
No external dependencies — pure buffer parsing. Fast and works for all image formats.

**Aspect Ratio Mapping**:
- `9:16` → Instagram Stories, Reels (vertical)
- `4:5` → Instagram Feed (slightly tall)
- `1:1` → Facebook Feed (square)

#### Step 2: Create Kie.ai Task
```typescript
POST https://api.kie.ai/api/v1/jobs/createTask
Headers: Authorization: Bearer {KIE_AI_API_KEY}

Body:
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Bold headline 'FUEL YOUR HUSTLE' in white sans-serif text...",
    "image_input": ["https://meta-cdn.com/competitor-ad.jpg"],
    "aspect_ratio": "9:16",
    "output_format": "png"
  }
}

Response:
{
  "data": {
    "taskId": "abc123xyz"
  }
}
```

#### Step 3: Poll for Completion
```typescript
for (let i = 0; i < 80; i++) {  // 80 polls × 3s = 4 min timeout
  await sleep(3000);
  
  GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=abc123xyz
  
  Response:
  {
    "data": {
      "state": "success",
      "resultJson": "{\"resultUrls\":[\"https://kie-cdn.com/generated.png\"]}"
    }
  }
  
  if (state === "success") {
    const imageUrl = resultJson.resultUrls[0];
    return await downloadImage(imageUrl);
  }
}
```

**Polling Strategy**:
- Poll every 3 seconds
- Log progress every 10 polls (`Poll 0/80`, `Poll 10/80`, ...)
- Timeout after 4 minutes (80 × 3s)

#### Step 4: Download & Store Locally
```typescript
async function downloadGeneratedImage(url: string, taskId: string) {
  const dir = "data/generated-images/";
  const filename = `${taskId}.png`;
  
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  
  fs.writeFileSync(path.join(dir, filename), buffer);
  
  // Return proxy path (not direct CDN URL — Meta CDN URLs expire)
  return `/api/proxy-image?path=generated-images/${filename}`;
}
```

**Why Download Locally?**
- Meta CDN URLs **expire** — images must be stored locally
- `/api/proxy-image` serves them consistently
- Concepts remain viewable long-term

### Output
```typescript
concept.generatedImageUrl = "/api/proxy-image?path=generated-images/abc123xyz.png"
```

### Image Prompt Structure (Critical)
Most competitor ads are **designed graphics with text overlays**, not just product photos. The `imagePrompt` must describe the **full composition**:

```
GOOD imagePrompt:
"Bold white text 'FUEL YOUR HUSTLE' centered at top in sans-serif font. 
Below: product shot of blue protein bottle on gradient purple-to-black 
background. Bottom right: '20G PROTEIN' in yellow badge. Clean, modern, 
high-contrast design matching competitor's energy aesthetic."

BAD imagePrompt:
"A protein bottle"  ← This generates just a photo, not an ad graphic
```

---

## How They Connect — Complete Flow

### User Generates 10 Ad Concepts

```
1. COMPETITIVE ANALYSIS (already done in Step 2)
   ↓
   Top competitor ads ranked by score
   ↓
2. BATCH GENERATION (Step 4)
   ↓
   For each concept (3 in parallel):
   
   a) Pair product with top ad
      Product: "Clear Protein" + Competitor Ad (127 days running)
   
   b) Generate copy via Claude
      → Headline, body, CTA, image prompt, video script (if video)
   
   c) IMAGE GENERATION FLOW
      → Detect aspect ratio (9:16)
      → Call Kie.ai with prompt + reference URL + aspect ratio
      → Poll for completion (up to 4 min)
      → Download image locally
      → concept.generatedImageUrl = "/api/proxy-image?path=..."
   
   d) QUALITY CONTROL SYSTEM
      → Send concept to Claude QC evaluator
      → Score: brandConsistency (40%), copyQuality (35%), visualRelevance (25%)
      → Overall: 7.2/10
      → passed = true (≥6.0 threshold)
      
      IF failed (< 6.0):
        → Retry with QC feedback injected
        → Re-generate image
        → Re-score
        → Keep whichever scored higher
   
   e) Stream result to user via SSE
      → User sees concept in real-time
   
   f) Next batch of 3...
```

### Final Result
User sees only **concepts that passed QC** (≥6.0), each with:
- AI-written copy adapted from proven competitor strategies
- AI-generated image matching competitor's visual approach
- Correct aspect ratio (9:16, 4:5, or 1:1)
- Side-by-side comparison with reference ad

---

## Key Design Decisions

### Why Weight Days Running So Heavily?
**Direct-response advertising on Meta is ruthlessly ROI-driven.** If an ad isn't profitable, it gets turned off within days. An ad running 60+ days is almost certainly making money — that's the strongest signal.

### Why Pass Threshold at 6.0/10?
**Balancing quality vs. volume.** Too strict (≥7.0) rejects solid ads. Too loose (≥5.0) lets through generic filler. 6.0 catches real failures (wrong product, nonsense) while passing competent work.

### Why Only One Retry?
**Cost control.** Each concept costs:
- 1 Claude API call (copy generation)
- 1 Kie.ai image generation (~$0.01)
- 1 Claude API call (QC evaluation)
- If failed: +1 Claude call (retry copy) + +1 Kie.ai + +1 Claude QC

Two retries would **triple** the cost. One retry finds most fixable issues.

### Why Download Images Locally?
**Meta CDN URLs expire.** Competitor ad images pulled from Meta's CDN are only valid for ~24-48 hours. Generated images from Kie.ai might also expire. Local storage ensures concepts remain viewable indefinitely.

### Why Parse Image Dimensions from Headers?
**No external dependencies.** Using a library like `sharp` or `image-size` adds bloat. Pure buffer parsing (PNG/JPEG/WebP headers) is <100 lines of code and works for 99% of images.

---

## Performance Characteristics

### Competitive Analysis
- **Time**: ~5ms (in-memory sorting)
- **API Calls**: 0
- **Cost**: $0

### QC Scoring (per concept)
- **Time**: ~3-5 seconds
- **API Calls**: 1 Claude Sonnet 4.5 call (1024 tokens max)
- **Cost**: ~$0.003 per evaluation

### Image Generation (per concept)
- **Time**: ~30-90 seconds (Kie.ai polling)
- **API Calls**: 1 Kie.ai task creation + polling
- **Cost**: ~$0.01 per image

### Full Batch (10 concepts, 3 parallel)
- **Time**: ~2-3 minutes total
- **Batches**: 4 batches of 3 (parallelized)
- **Total Cost**: ~$0.13 (10 × $0.013 per concept)

---

## Testing

The codebase includes **30+ unit tests** covering:
- Competitor scoring algorithm (edge cases: empty ads, single advertiser, ties)
- CSV/JSON data contracts
- Type validation

Run tests:
```bash
cd app
npx vitest run
```
