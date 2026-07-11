# Real-World Examples — Ads AI Tool

## Example 1: Competitive Analysis in Action

### Scenario
User searches Meta Ad Library for keywords: `["protein powder", "fitness supplement", "keto protein"]`

### Raw Data (250 ads scraped)
```
Ad 1: BLOOM Nutrition, 127 days, "Still paying $3 per serving?..."
Ad 2: BLOOM Nutrition, 89 days, "Your protein shake shouldn't taste..."
Ad 3: BLOOM Nutrition, 67 days, "3 ingredients. 20g protein. Zero..."
Ad 4: Competitor B, 45 days, "NEW: Plant-based protein..."
Ad 5: Competitor B, 38 days, "Subscribe & Save 15%..."
Ad 6: Competitor C, 12 days, "Limited time: Buy 2 Get 1..."
Ad 7: Competitor C, 8 days, "Fuel your morning with..."
... (243 more ads)
```

### After Grouping & Scoring

**BLOOM Nutrition** (Rank #1)
```
Total Ads: 12
Active Ads: 8
Max Days Running: 127 days  ← Longest-running ad
Avg Days Running: 68 days
Creative Diversity: 9 unique copy variations

Score Calculation:
  (127 × 3) = 381   ← Days running (strongest signal)
+ (68 × 2)  = 136   ← Average longevity
+ (12 × 10) = 120   ← Volume (serious budget)
+ (9 × 5)   = 45    ← Testing sophistication
─────────────────
  TOTAL     = 1,181 points
```

**Competitor B** (Rank #2)
```
Total Ads: 7
Max Days Running: 45 days
Avg Days Running: 32 days
Creative Diversity: 5

Score: (45×3) + (32×2) + (7×10) + (5×5) = 294 points
```

**Competitor C** (Rank #3)
```
Total Ads: 3
Max Days Running: 12 days  ← Short duration = less proven
Avg Days Running: 9 days
Creative Diversity: 3

Score: (12×3) + (9×2) + (3×10) + (3×5) = 93 points
```

### Why BLOOM Wins
- **127-day ad** = Almost certainly profitable (4+ months running)
- **12 total ads** = Big budget, serious competitor
- **9 unique variations** = Sophisticated testing (not just running the same ad)

### User Takeaway
"Focus on BLOOM's ads — they've been spending money here for 4+ months. Their strategies are proven winners."

---

## Example 2: Quality Control Catch & Fix

### Scenario
Generating an ad for "BLOOM Clear Protein" using a competitor's ad about whey protein powder.

### First Attempt (Generated Ad)

```json
{
  "primaryText": "🥤 Mix. Shake. Enjoy.\n\nOur premium whey protein delivers 25g of muscle-building protein in every scoop. Packed with BCAAs and digestive enzymes for maximum absorption.\n\nChoose from 8 delicious flavors. No artificial sweeteners. Gluten-free. Non-GMO.\n\nJoin 500,000+ athletes who trust our formula.",
  "headline": "Premium Whey Protein",
  "description": "8 Flavors Available",
  "ctaText": "Shop Now",
  "productName": "Clear Protein"
}
```

### QC Evaluation (First Pass)

**Inputs to QC**:
- Brand: "BLOOM Nutrition"
- Product Catalog:
  ```
  - Clear Protein: 20g protein, whey isolate, clear liquid (not milky shake), refreshing fruit flavors
  - Energy Drink: Natural caffeine, B vitamins
  - Greens Powder: 30 superfoods
  ```
- Generated ad (above)

**QC Scores**:
```
Brand Consistency: 4/10  ← Wrong product description
  - Ad describes "whey protein powder" and "scoop"
  - Clear Protein is a clear liquid drink (not powder)
  - "Mix. Shake. Enjoy" implies powder mixing
  - Product has 20g protein, not 25g

Copy Quality: 6/10
  - Hook is weak ("Mix. Shake. Enjoy" — generic)
  - Copy is grammatically fine but generic
  - No compelling reason to buy

Strategic Relevance: 7/10
  - Replicates benefit-list structure well
  - Matches social proof approach (500k athletes)
  - Missing the competitor's "question hook" technique

Overall Score: (4×0.4) + (6×0.35) + (7×0.25) = 5.35/10

RESULT: FAILED (< 6.0) ❌

Feedback: "Ad describes whey protein POWDER but Clear Protein is a clear LIQUID drink. Fix product form. Hook is generic — use a question hook like the competitor ad."
```

### Retry (With QC Feedback Injected)

**Prompt Includes**:
```
## PREVIOUS ATTEMPT FEEDBACK
A previous version was rejected. Fix these issues:
"Ad describes whey protein POWDER but Clear Protein is a clear LIQUID drink. 
Fix product form. Hook is generic — use a question hook like the competitor ad."

## PRODUCT TO FEATURE (THIS IS WHAT THE AD IS ABOUT)
- Name: Clear Protein
- Description: 20g whey protein isolate in a clear, refreshing liquid (not a milky shake). Light fruit flavors. Ready to drink or mix with water.
- Price: $34.99

CRITICAL: The ad MUST be about THIS specific product. Do NOT describe powder, scoops, or shakes.
```

**Second Attempt (Regenerated)**:
```json
{
  "primaryText": "Still drinking chalky protein shakes? 😬\n\nBLOOM Clear Protein gives you 20g of pure whey isolate in a light, refreshing drink—not a thick shake. Think: fruit-flavored water with serious protein.\n\nNo bloating. No gritty texture. Just clean hydration + muscle recovery.\n\nCherry Lemonade, Peach Mango, Tropical Punch. Grab yours now. 👇",
  "headline": "Clear Protein. Not a Shake.",
  "description": "Light & Refreshing",
  "ctaText": "Shop Now",
  "productName": "Clear Protein"
}
```

### QC Re-Evaluation

```
Brand Consistency: 9/10  ← FIXED
  - Correctly describes Clear Protein as a liquid drink
  - Differentiates from "chalky shakes" (accurate positioning)
  - 20g protein (correct)
  - Mentions specific flavors (Cherry Lemonade, Peach Mango)

Copy Quality: 8/10  ← IMPROVED
  - Strong question hook ("Still drinking chalky protein shakes?")
  - Benefit-driven (no bloating, no grit, hydration + recovery)
  - Specific product details (flavors, light texture)
  - Clear CTA with emoji

Strategic Relevance: 8/10
  - Replicates competitor's question hook technique ✓
  - Matches benefit-list structure ✓
  - Differentiates product smartly

Overall Score: (9×0.4) + (8×0.35) + (8×0.25) = 8.4/10

RESULT: PASSED ✓

Feedback: "Strong question hook, accurate product description, clear differentiation."
```

### Final Output (User Sees)
✅ **Concept Approved** — QC Score: 8.4/10 (internal only, not shown to user)

Side-by-side view:
- LEFT: Competitor's ad (127 days running)
- RIGHT: Generated BLOOM ad (retry version)

User clicks **"Copy"** button → sees the regenerated ad copy.

---

## Example 3: Image Generation Flow (Video Concept)

### Scenario
Competitor ad is a **9:16 vertical video** (Instagram Reels) showing a before/after transformation.

### Step 1: Detect Aspect Ratio

Competitor ad image path: `data/competitor-ads/bloom/1234567890.png`

```typescript
// Read file buffer
const buf = fs.readFileSync("data/competitor-ads/bloom/1234567890.png");

// Parse PNG header (bytes 16-23)
const width = buf.readUInt32BE(16);   // 1080
const height = buf.readUInt32BE(20);  // 1920

// Calculate ratio
const ratio = height / width;  // 1920 / 1080 = 1.78

// Detect format
if (ratio > 1.4) return "9:16";  // ✓ MATCH
```

**Result**: Aspect ratio = `9:16` (vertical video format)

### Step 2: Generate Video Script (Claude)

**Input**:
- Reference ad is VIDEO (`videoUrl` present)
- Product: "Clear Protein"
- Competitor ad: 90-day-old transformation video

**Claude generates**:
```json
{
  "adType": "video",
  "videoScript": "SCENE 1 (0-3s): Close-up of person grimacing while drinking thick, chalky protein shake. Text overlay: 'STILL FORCING DOWN CHALKY SHAKES?' [Audio: slurping sound]\n\nSCENE 2 (3-5s): Person sets down shake, frustrated. Text overlay: 'THERE'S A BETTER WAY' [Audio: upbeat music starts]\n\nSCENE 3 (5-10s): Product shot of BLOOM Clear Protein bottles in Cherry Lemonade, Peach Mango, Tropical Punch. Smooth pour into glass over ice. Text overlay: 'CLEAR PROTEIN. LIGHT. REFRESHING. 20G.' [Audio: satisfying pour sound]\n\nSCENE 4 (10-13s): Person drinking Clear Protein, smiling. Split-screen: Before (grimace) / After (smile). Text overlay: 'NO BLOATING. NO GRIT. JUST RESULTS.' [Audio: voiceover: 'Finally, protein that doesn't feel like a chore.']\n\nSCENE 5 (13-15s): Product lineup with CTA. Text overlay: 'SHOP BLOOM CLEAR PROTEIN' + swipe-up arrow. [Audio: music fade]\n\nTotal Duration: 15 seconds\nMusic: Upbeat, energetic pop track\nMood: Relatable problem → clean solution",
  
  "imagePrompt": "KEY FRAME (Scene 1 — the hook): Close-up shot of person's disgusted facial expression while drinking a thick protein shake. Bold white text overlay at top: 'STILL FORCING DOWN CHALKY SHAKES?' in sans-serif font. Dark teal gradient background. Dramatic lighting. Instagram Reels 9:16 vertical format. High contrast, attention-grabbing visual.",
  
  "primaryText": "Still drinking chalky protein shakes? 😬\n\nWatch how Clear Protein changed everything...",
  "headline": "Clear Protein. Not a Shake.",
  ...
}
```

### Step 3: Generate Key Frame Image (Kie.ai)

**API Call**:
```json
POST https://api.kie.ai/api/v1/jobs/createTask

{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Close-up shot of person's disgusted facial expression while drinking a thick protein shake. Bold white text overlay at top: 'STILL FORCING DOWN CHALKY SHAKES?' in sans-serif font. Dark teal gradient background. Dramatic lighting. Instagram Reels 9:16 vertical format. High contrast, attention-grabbing visual.",
    "image_input": ["https://meta-cdn.com/competitor-video-thumbnail.jpg"],
    "aspect_ratio": "9:16",  ← Matches competitor's video format
    "output_format": "png"
  }
}
```

**Response**:
```json
{ "data": { "taskId": "xyz789abc" } }
```

**Polling** (every 3 seconds):
```
Poll 0:  state = "processing"
Poll 5:  state = "processing"
Poll 10: state = "processing"
Poll 15: state = "success" ✓

Result: {
  "data": {
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://kie-cdn.com/xyz789abc.png\"]}"
  }
}
```

**Download & Store**:
```typescript
// Fetch from Kie.ai CDN
const res = await fetch("https://kie-cdn.com/xyz789abc.png");
const buffer = Buffer.from(await res.arrayBuffer());

// Save locally
fs.writeFileSync("data/generated-images/xyz789abc.png", buffer);

// Return proxy path (not CDN URL — it expires)
concept.generatedImageUrl = "/api/proxy-image?path=generated-images/xyz789abc.png";
```

### Step 4: Display to User

**Create Ads Page** shows:

```
┌─────────────────────────────────────────────────────────────┐
│  Concept #1  │  Clear Protein  │ [Video] 🎥  │ ⭐ Star     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐     ──►     ┌──────────────┐            │
│  │ Competitor   │              │ Your BLOOM   │            │
│  │ Reference    │              │ Version      │            │
│  │              │              │              │            │
│  │ [Play btn]   │              │ [Key frame]  │            │
│  │ 127 days     │              │ 9:16 format  │            │
│  │ 9:16 video   │              │              │            │
│  └──────────────┘              └──────────────┘            │
│                                                             │
│  [📄 Ad Copy]  [🎬 Video Script]  [💡 Strategy]           │
└─────────────────────────────────────────────────────────────┘
```

User clicks **"Video Script"** → Modal opens:

```
┌───────────────────────────────────────────────────────┐
│  📄 Ad Copy  │  🎬 Video Script  │  💡 Strategy      │
├───────────────────────────────────────────────────────┤
│                                                       │
│  SCENE 1 (0-3s):                                      │
│  Close-up of person grimacing while drinking thick,  │
│  chalky protein shake. Text overlay: 'STILL FORCING  │
│  DOWN CHALKY SHAKES?' [Audio: slurping sound]        │
│                                                       │
│  SCENE 2 (3-5s):                                      │
│  Person sets down shake, frustrated. Text overlay:   │
│  'THERE'S A BETTER WAY' [Audio: upbeat music starts] │
│                                                       │
│  SCENE 3 (5-10s):                                     │
│  Product shot of BLOOM Clear Protein bottles...      │
│                                                       │
│  ... (full script)                                    │
│                                                       │
│  Total Duration: 15 seconds                          │
│  Music: Upbeat, energetic pop track                  │
│  Mood: Relatable problem → clean solution            │
└───────────────────────────────────────────────────────┘
```

### User Hands Script to Video Editor
- Editor films scenes following script
- Final video is 9:16 vertical format (matches strategy)
- Uploads to Meta Ads Manager

**Result**: Ad concept that replicates a proven video ad's strategy (90 days running) adapted for BLOOM's Clear Protein.

---

## Example 4: Why Days Running Matters

### Scenario: Two Advertisers, Different Strategies

**Advertiser A: "Flash Sale Inc"**
```
Total Ads: 15
Max Days Running: 8 days  ← Short bursts
Avg Days Running: 5 days
Creative Diversity: 12

Score: (8×3) + (5×2) + (15×10) + (12×5) = 244 points
```

**Advertiser B: "Steady Growth Co"**
```
Total Ads: 6
Max Days Running: 120 days  ← Long-running winner
Avg Days Running: 85 days
Creative Diversity: 4

Score: (120×3) + (85×2) + (6×10) + (4×5) = 610 points
```

### Why Advertiser B Ranks Higher (610 vs 244)

**Advertiser A** (Flash Sale Inc):
- Runs many short campaigns (5-8 days each)
- High volume (15 ads) but short duration
- Likely testing heavily, not finding winners
- OR: Running promotional campaigns that don't scale

**Advertiser B** (Steady Growth Co):
- Fewer ads (6 total) but **120-day winner**
- 85-day average = consistent profitability
- Found winning formulas and keeps running them
- This is the advertiser to replicate

### User Takeaway
"Don't be distracted by volume. One ad running 120 days is worth more than 15 ads running 5 days each. Advertiser B has found something that works — study their approach."

---

## Example 5: Product Catalog Prevents False QC Failures

### Scenario
Brand: "BLOOM Nutrition"
Category: "Hydration & Wellness"

**Product Catalog**:
```
1. Hydration Mix (electrolytes, no caffeine)
2. Energy Drink (caffeine, B vitamins)
3. Clear Protein (20g protein, whey isolate)
4. Greens Powder (superfoods, gut health)
```

### Generated Ad #1: Clear Protein
```json
{
  "primaryText": "20g protein in a refreshing drink...",
  "productName": "Clear Protein"
}
```

### QC Evaluation WITHOUT Product Catalog

**QC Sees**:
- Brand category: "Hydration & Wellness"
- Ad is about: "Clear Protein" (20g protein)

**QC Logic**:
> "Brand is in 'Hydration & Wellness' category. Ad is about protein. Protein is not hydration. This looks like the ad copied the competitor's product category instead of the brand's."

**Result**: ❌ **FALSE FAILURE** (Brand Consistency: 3/10)

### QC Evaluation WITH Product Catalog

**QC Sees**:
- Brand category: "Hydration & Wellness"
- **Full product catalog**:
  - Hydration Mix ← matches category
  - Energy Drink
  - **Clear Protein** ← REAL PRODUCT ✓
  - Greens Powder

**QC Logic**:
> "Clear Protein is in the catalog. It's a legitimate brand product. No conflict."

**Result**: ✅ **PASS** (Brand Consistency: 9/10)

### Why This Matters

**Without Catalog** (old system):
- 40% of concepts failed QC for "wrong category"
- Most were false positives (real products flagged as wrong)
- Wasted retries and user frustration

**With Catalog** (current system):
- False positives dropped to near zero
- QC only flags genuine issues (fabricated claims, wrong product)
- Higher pass rate, better user experience

---

## Summary: Real-World Impact

### Competitive Analysis
- **Input**: 250 scraped ads
- **Output**: Ranked list with #1 advertiser's longest ad running **127 days**
- **User Action**: Focus on proven winners, not volume

### Quality Control
- **Threshold**: 6.0/10 (catches failures, passes solid work)
- **Retry Rate**: ~15-20% of concepts need retry
- **Pass Rate**: ~90% after retry
- **User Experience**: Only see passing concepts (QC is invisible)

### Image Generation
- **Format Matching**: 9:16 video → 9:16 image (replicates proven format)
- **Reference Input**: Competitor's image influences style
- **Output**: Locally stored (Meta CDN URLs expire)

### End-to-End
- **10 concepts**: ~4-8 minutes, $0.16-$0.32
- **Quality**: 90%+ pass rate after QC
- **Strategy**: Based on ads running 60-120+ days (proven profitable)
