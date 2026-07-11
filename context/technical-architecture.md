# Technical Architecture

## System Overview

This is a **white-label AI ad creation tool** — a hybrid system (Claude Code CLI + Next.js web UI) for creating Facebook/Instagram ads by reverse-engineering competitor strategies.

**Core Value Proposition**: Generate ads based on proven-to-work competitor strategies (ads running 60-120+ days) instead of guessing.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE                            │
│  Next.js 15 + React 19 + Tailwind CSS v4 + shadcn/ui       │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐         ┌────▼────┐        ┌────▼────┐
   │ Step 1  │         │ Step 2  │        │ Step 3  │
   │ Brand   │────────►│  Find   │───────►│ What's  │
   │ Context │         │Competi- │        │Working? │
   └─────────┘         │  tors   │        └─────────┘
                       └─────────┘              │
                                                │
                                           ┌────▼────┐
                                           │ Step 4  │
                                           │ Create  │
                                           │  Ads    │
                                           └─────────┘
```

## Data Flow

### Step 1: Brand Context Collection

```
Input: Website URL, Instagram handle, YouTube URL (optional)

    ├──► FireCrawl API (crawls up to 15 pages)
    ├──► Apify Instagram Scraper (posts + profile)
    ├──► Apify YouTube Scraper (videos + transcripts)
    │
    ├──► Claude AI (analyzes text, extracts products)
    ├──► Gemini AI (analyzes images/videos visually)
    │
    └──► Output: brand-context.json + brand.csv (legacy)
         - Brand profile (name, description, tagline, category)
         - Product catalog (name, description, price, image)
         - Visual assets (favicon, logo, IG profile pic, web images)
         - YouTube content analysis (themes, tone, messaging)
```

**Files**:
- `data/brand-context.json` (primary storage)
- `data/brand.csv` (legacy fallback)
- `data/products.csv`
- `data/brand-assets/` (downloaded images)

### Step 2: Competitor Search

```
Input: Keywords ["protein powder", "keto supplements"]

    ├──► Apify Meta Ad Library Scraper (parallel batches of 3)
    │    - Scrapes ads per keyword
    │    - Downloads ad thumbnails locally
    │
    ├──► Data Quality Gates (apify.ts)
    │    - hasImage() filter
    │    - isDcoAd() filter (reject {{template}})
    │    - Deduplicate by primaryText
    │
    ├──► Competitive Analysis Algorithm (competitor-scoring.ts)
    │    - Group by advertiser
    │    - Calculate: maxDaysRunning, avgDaysRunning, totalAds, diversity
    │    - Score: (maxDays×3) + (avgDays×2) + (totalAds×10) + (diversity×5)
    │    - Sort descending
    │
    └──► Output: search-results.json
         - Ranked advertiser list
         - All scraped ads (meta-ads.csv)
         - Downloaded ad images (competitor-ads/{slug}/)
```

**Files**:
- `data/search-results.json` (scored advertisers)
- `data/meta-ads.csv` (all scraped ads)
- `data/competitor-ads/{advertiser-slug}/` (downloaded images)

### Step 3: Pattern Analysis

```
Input: Top 25 competitor ads (sorted by daysRunning)

    ├──► Claude AI (analyzeWinningPatterns)
    │    - Deep hook analysis (exact text, technique, psychology)
    │    - Winning patterns (hook type, copy structure, emotional angle)
    │
    └──► Output: analysis.json
         - hooks[] — per-ad hook analysis with effectiveness ratings
         - patterns[] — 5-8 recurring patterns with examples
         - summary — high-level insights
```

**Files**:
- `data/analysis.json`

### Step 4: Ad Concept Generation

```
Input: Count (1-30), Product filter (optional)

    ├──► Dynamic Pairing
    │    - Top N ads (sorted by daysRunning)
    │    - × Brand products (rotate)
    │    - = N pairings
    │
    ├──► Parallel Batches of 3 Concepts
    │    │
    │    ├──► Per Concept:
    │    │    │
    │    │    ├──► 1. Generate Copy (claude.ts → generateReplicaAdConcept)
    │    │    │    - Input: brand, product, reference ad, hook analysis
    │    │    │    - Output: headline, body, CTA, imagePrompt, videoScript (if video)
    │    │    │
    │    │    ├──► 2. Generate Image (kie-ai.ts → generateAdImage)
    │    │    │    - Detect aspect ratio from reference ad (9:16, 4:5, 1:1)
    │    │    │    - Call Kie.ai API with prompt + reference URL + aspect ratio
    │    │    │    - Poll for completion (3s intervals, 4min timeout)
    │    │    │    - Download locally to generated-images/
    │    │    │
    │    │    └──► 3. Quality Control (quality-control.ts → evaluateCreative)
    │    │         - Claude evaluates: brand consistency (40%), copy quality (35%), strategic relevance (25%)
    │    │         - Score ≥6.0 = PASS, <6.0 = FAIL
    │    │         - If failed: retry once with QC feedback
    │    │
    │    └──► Stream via SSE (Server-Sent Events)
    │         - User sees concepts as they complete
    │
    └──► Output: concepts.csv (or Supabase concepts table if authenticated)
         - Generated ad concepts (only QC-passed shown to user)
         - Generated images (generated-images/{taskId}.png)
```

**Files**:
- `data/concepts.csv` (or Supabase)
- `data/generated-images/` (AI-generated ad images)

## Core Algorithms

### 1. Competitive Scoring
**File**: `app/src/lib/competitor-scoring.ts`

```typescript
score = (maxDaysRunning × 3) + (avgDaysRunning × 2) + (totalAds × 10) + (creativeDiversity × 5)
```

**Rationale**: Days running is the strongest profitability signal.

### 2. Quality Control
**File**: `app/src/lib/quality-control.ts`

```typescript
overallScore = (brandConsistency × 0.4) + (copyQuality × 0.35) + (visualRelevance × 0.25)
passed = overallScore >= 6.0
```

**Rationale**: 6.0 threshold catches failures, passes solid work.

### 3. Aspect Ratio Detection
**File**: `app/src/app/api/create/batch/route.ts`

```typescript
ratio = height / width
if (ratio > 1.4) return "9:16"  // Vertical
if (ratio > 1.1) return "4:5"   // Feed
return "1:1"                    // Square
```

**Rationale**: Match the format that's proven to work.

## Tech Stack

### Frontend
- **Framework**: Next.js 15.2.4 (App Router)
- **React**: 19.2.4
- **Styling**: Tailwind CSS v4 (oklch colors), dark glass-morphism theme
- **UI Components**: shadcn/ui (base-ui v1.4.0)
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **AI Services**:
  - Anthropic Claude Sonnet 4.5 (ad copy, analysis, QC)
  - Google Gemini (visual analysis of brand images/videos)
  - Kie.ai Nano Banana Pro (image generation)
- **Data Scraping**:
  - FireCrawl (website crawling)
  - Apify (Instagram, Meta Ad Library, YouTube)

### Data Storage
- **Local**: JSON files + CSV files in `data/` directory
- **Cloud**: Supabase (PostgreSQL) for multi-user mode
- **Images**: Downloaded locally, served via `/api/proxy-image`

### Testing
- **Framework**: Vitest
- **Coverage**: 30+ unit tests (scoring, CSV I/O, type contracts)

## API Integration Points

### External APIs

| Service | Purpose | Cost | Rate Limits |
|---------|---------|------|-------------|
| Anthropic Claude | Ad copy generation, competitor analysis, pattern analysis, QC | ~$0.003 per call | None specified |
| Google Gemini | Brand image/video visual analysis | Free (with quota) | 60 requests/min |
| Kie.ai | AI image generation (Nano Banana Pro) | ~$0.01 per image | Credits-based |
| FireCrawl | Website scraping (up to 15 pages) | ~$0.02 per crawl | API key based |
| Apify | Instagram, Meta Ad Library, YouTube scraping | ~$0.05 per scrape | Credits-based |

### Internal APIs

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/brand` | GET, POST | Get brand + products, scrape brand with SSE |
| `/api/brand-context` | GET, PUT | Get/save brand context JSON |
| `/api/search` | GET, POST | Get search state, search Meta Ad Library |
| `/api/analysis` | GET, POST | Get analysis, run pattern analysis |
| `/api/create` | GET, POST, PATCH | List concepts, generate, star |
| `/api/create/batch` | POST | Batch-generate concepts with QC |
| `/api/knowledge` | GET | Knowledge base entries |
| `/api/proxy-image` | GET | Proxy local/remote images |
| `/api/status` | GET | Step completion check |

## Data Models

### BrandContext
```typescript
interface BrandContext {
  name: string;
  url?: string;
  description: string;
  tagline?: string;
  category: string;
  keywords: string[];
  colors?: string;
  style?: string;
  visualAnalysis?: string;
  instagramHandle?: string;
  instagramFollowers?: number;
  instagramProfilePicUrl?: string;
  youtubeChannelUrl?: string;
  youtubeContentAnalysis?: {
    brandThemes: string[];
    tone: string;
    messaging: string;
    targetAudience: string;
    contentStyle: string;
    keyTopics: string[];
  };
  logoUrl?: string;
  faviconUrl?: string;
  sources: { type: string; url?: string; description: string }[];
  collectedAt: string;
  collectedBy: "claude-code" | "web-form";
}
```

### Product
```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  category: string;
}
```

### MetaAdEntry
```typescript
interface MetaAdEntry {
  id: string;                // Meta archive ID
  advertiser: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaText: string;
  imageUrl: string;          // Remote CDN URL
  localImagePath: string;    // Local path (competitor-ads/{slug}/{id}.png)
  videoUrl: string;          // If video ad
  platforms: string;         // "Facebook, Instagram"
  daysRunning: number;       // Days the ad has been running
  isActive: boolean;
}
```

### ScoredAdvertiser
```typescript
interface ScoredAdvertiser {
  name: string;
  totalAds: number;
  activeAds: number;
  maxDaysRunning: number;
  avgDaysRunning: number;
  creativeDiversity: number;
  score: number;             // Weighted composite score
  adIds: string[];           // Meta archive IDs
}
```

### AdConcept
```typescript
interface AdConcept {
  id: string;
  headline: string;
  body: string;              // Primary text
  description: string;       // Link description
  ctaText: string;
  imagePrompt: string;
  generatedImageUrl: string;
  referenceImageUrl: string;
  videoScript?: string;      // If video concept
  adType?: "static" | "video";
  targetAudience: string;
  format: string;
  placements: string;        // "Facebook Feed, Instagram Feed"
  rationale: string;         // Why this concept works
  productName: string;
  inspirationAdIds: string;  // Comma-separated Meta ad IDs
  starred: boolean;
  qualityScore?: number;     // 0-10 (internal only)
  qualityFeedback?: string;  // QC feedback (internal only)
  qcPassed?: boolean;        // >= 6.0
  createdAt: string;
}
```

### AnalysisResult
```typescript
interface AnalysisResult {
  hooks: HookAnalysis[];     // Per-ad hook analysis
  patterns: Pattern[];       // Winning patterns
  summary: string;
  analyzedAt: string;
}

interface HookAnalysis {
  adId: string;
  hookText: string;          // Exact hook text
  hookTechnique: string;     // Question, bold claim, social proof, etc.
  hookVisual: string;        // Visual hook description
  whyItWorks: string;        // Psychology explanation
  effectiveness: number;     // 1-10 rating
  videoFirstSeconds?: string; // Video-specific
}

interface Pattern {
  name: string;
  hookType: string;
  copyStructure: string;
  emotionalAngle: string;
  offerType: string;
  visualApproach: string;
  hookAnalysis: string;      // Deep hook paragraph
  examples: { adId: string; excerpt: string }[];
}
```

## Performance Characteristics

### End-to-End Timing (10 Concepts)

| Phase | Time | Parallelization |
|-------|------|-----------------|
| Brand scraping | 30-60s | Sequential (FireCrawl + Apify) |
| Competitor search | 30-90s | Parallel batches of 3 keywords |
| Pattern analysis | 15-30s | Single Claude call |
| Concept generation | 4-8 min | Parallel batches of 3 concepts |

**Total User Flow**: ~6-10 minutes from brand URL to 10 polished ad concepts

### Cost Breakdown (Per 10 Concepts)

| Item | Cost | Notes |
|------|------|-------|
| Brand scraping | $0.07 | FireCrawl + Apify IG + Gemini vision |
| Competitor search | $0.15 | Apify Meta Ad Library (3 keywords) |
| Pattern analysis | $0.01 | 1 Claude call |
| Ad copy generation | $0.03 | 10 Claude calls |
| Image generation | $0.10 | 10 Kie.ai images |
| QC evaluation | $0.03 | 10 Claude QC calls |
| Retries (20% rate) | $0.04 | 2 retries (copy + image + QC) |
| **Total** | **$0.43** | **~$0.04 per concept** |

### Scalability

**Current Bottlenecks**:
1. **Image generation** (30-90s per image) — Kie.ai polling
2. **Apify scraping** (10-30s per keyword) — Meta Ad Library rate limits

**Optimizations**:
- Parallel batches of 3 (concepts, keywords)
- Local caching (images, scraped ads)
- SSE streaming (user sees progress in real-time)

**Theoretical Max Throughput**:
- 30 concepts/10min (3 parallel × 10 batches × ~1min/batch)
- Limited by Kie.ai image generation speed

## Security & Data Privacy

### API Keys
All API keys stored in `.env` (not committed):
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- `FIRECRAWL_API_KEY`
- `APIFY_API_TOKEN`
- `KIE_AI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` (multi-user mode)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (multi-user mode)

### Data Storage
- **Local mode**: JSON/CSV in `data/` directory (single-user)
- **Cloud mode**: Supabase PostgreSQL (multi-user, authenticated)

### Image Proxying
`/api/proxy-image` serves local images to avoid CORS issues and provide consistent URLs.

## Deployment

### Development
```bash
cd app
npm install
npm run dev  # Starts Next.js dev server on :3000
```

### Production
```bash
cd app
npm run build
npm start
```

### Environment
- Node.js 18+
- All API keys configured in `.env`
- Write access to `data/` directory

## Testing

```bash
cd app
npx vitest run  # Run unit tests
```

**Test Coverage**:
- Competitive scoring algorithm (edge cases)
- CSV/JSON I/O (read/write/update)
- Type contracts (BrandContext, AdConcept, etc.)
- Aspect ratio detection (PNG, JPEG, WebP)

## Error Handling

### User-Facing Errors
- Missing brand context → Redirect to Step 1
- No competitor ads → Show "Search first" message
- API failures → Display error message with retry option
- Insufficient credits → Show credit balance warning

### Silent Fallbacks
- Image generation fails → Concept saved without image
- QC retry fails → Keep original if retry scores lower
- Video URL missing → Treat as static ad

### Logging
Console logs for debugging (development only):
- `[Kie.ai]` — Image generation progress
- `[Apify]` — Scraping status
- `[QC]` — Quality control scores

## Related Documentation

- [CLAUDE.md](/home/kamlesh/Documents/Kamlesh/Twitter/ads-ai-main/CLAUDE.md) — Workspace overview & commands
- [GETTING-STARTED.md](/home/kamlesh/Documents/Kamlesh/Twitter/ads-ai-main/GETTING-STARTED.md) — User-facing setup guide
- [context/competitive-analysis-system.md](./competitive-analysis-system.md) — Scoring algorithm deep-dive
- [context/quality-control-system.md](./quality-control-system.md) — QC system deep-dive
- [context/image-generation-system.md](./image-generation-system.md) — Image generation deep-dive
