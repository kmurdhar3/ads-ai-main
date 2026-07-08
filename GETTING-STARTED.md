# Ads AI — Getting Started

## What This Tool Does

An AI-powered ad creation tool that studies your competitors' proven ads and generates new ad concepts for your brand. It finds advertisers spending real money in your space, analyzes what's working, and creates ad copy + visuals that replicate winning strategies. Works for any brand in any niche.

## Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org/)
- **Claude Code CLI** — for the `/collect-brand` command (optional — you can also use the web form)
- **API keys** — see Environment Setup below

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/melnikoff-oleg/ads-ai.git
cd ads-ai

# 2. Set up environment variables
cp .env.example .env
# Edit .env and fill in your API keys (see below)

# 3. Install dependencies
cd app
npm install

# 4. Start the dev server
npm run dev

# 5. Open the app
open http://localhost:3000
```

## Environment Setup

Copy `.env.example` to `.env` in the project root and fill in your API keys:

| Variable | Purpose | Required? |
|----------|---------|-----------|
| `ANTHROPIC_API_KEY` | Claude AI — ad copy generation, competitor analysis, quality control | **Required** |
| `GEMINI_API_KEY` | Gemini — brand image and video visual analysis | **Required** |
| `FIRECRAWL_API_KEY` | FireCrawl — website scraping (crawls up to 15 pages) | Required if providing a website URL |
| `APIFY_API_TOKEN` | Apify — Instagram scraping + Meta Ad Library search | **Required** |
| `KIE_AI_API_KEY` | Kie.ai — AI image generation for ad creatives | **Required** |

Where to get each key:
- **Anthropic**: https://console.anthropic.com/
- **Gemini**: https://aistudio.google.com/apikey
- **FireCrawl**: https://firecrawl.dev/
- **Apify**: https://console.apify.com/account/integrations
- **Kie.ai**: https://kie.ai/

## How It Works — 4 Steps

The sidebar shows your progress through each step with green checkmarks when complete.

### Step 1: Collect Brand Context

**Option A — Web form (quick):**
Open http://localhost:3000/brand, enter your website URL and optional Instagram handle, and click "Scrape Brand." The tool will crawl your site, extract products, download visuals, and build your brand profile automatically.

**Option B — Claude Code (flexible):**
Open Claude Code in this project directory and run `/collect-brand`. This guided flow accepts any combination of:
- A website URL — crawls and extracts products, brand identity, visuals
- An Instagram handle — scrapes posts and profile picture
- Keywords or category (e.g., "wireless charging accessories")
- Files (product catalogs, brand guides, images)

The tool will:
- Scrape and analyze everything you provide
- Use Gemini AI to analyze your images and videos (visual style, colors, composition)
- Build a complete brand context profile with product catalog
- Download brand assets (website images, Instagram posts, profile pic, favicon)

**View results**: http://localhost:3000/brand — you'll see your brand profile with visuals gallery, product catalog, and brand attributes.

### Step 2: Find Competitors

Open http://localhost:3000/competitors

The tool searches the **Meta Ad Library** by keywords related to your brand. Keywords are auto-suggested from your brand context — edit them or add your own.

It finds advertisers actually spending money in your space and ranks them by:
- **Days running** — longer = more profitable (the #1 signal)
- **Ad count** — more active ads = bigger budget
- **Creative diversity** — more variety = more sophisticated testing

Each advertiser card shows thumbnail previews of their ads so you can see the creative quality at a glance.

**You control**: Which keywords to search, how many ads to scrape per keyword. Start with 3-5 ads per keyword to test, then use 15+ for thorough search.

### Step 3: Analyze What's Working

Open http://localhost:3000/analysis

Claude analyzes the top 25 competitor ads and extracts:
- **Deep hook analysis** — the exact opening text, technique, and psychology behind the highest-performing hooks
- **Winning patterns** — 5-8 recurring patterns across hook type, copy structure, emotional angle, offer type, and visual approach

The hooks section shows ad thumbnails with effectiveness ratings, so you can see exactly which creative approaches are working and why.

### Step 4: Create Your Ads

Open http://localhost:3000/create

The tool generates ad concepts for your brand, each one replicating a proven competitor's strategy:
- **AI-written copy** — headline, primary text, description, CTA
- **AI-generated image** — with the competitor's visual approach adapted for your brand
- **Side-by-side comparison** — their original reference ad → your version
- **Video concepts** — if the reference ad is a video, you get a scene-by-scene script + key frame

**You control**: How many concepts to generate (1-30), which products to feature. Concepts are generated in parallel batches of 3 (~2 min per batch).

Every concept goes through an automatic quality check — only passing concepts are shown.

## Tips

- **Start small**: Generate 1-3 concepts on your first run to verify everything works before scaling up.
- **Keywords matter**: Narrow keywords ("organic mushroom coffee") find your real competitors better than broad ones ("coffee").
- **Days running is your best signal**: An ad running 60+ days is almost certainly profitable. Focus on those advertisers.
- **Change brand = fresh start**: When you scrape a new brand, all downstream data (competitors, analysis, concepts) is cleared automatically so you start fresh.

## Project Structure

```
ads-ai/
├── app/                    # Next.js web application
│   ├── src/
│   │   ├── app/            # Pages and API routes
│   │   ├── components/     # UI components
│   │   └── lib/            # API integrations and business logic
│   ├── package.json
│   └── vitest.config.ts    # Test configuration
├── data/                   # Runtime data (brand context, ads, images)
├── context/                # Project context files
├── plans/                  # Implementation plans
├── .claude/commands/       # Claude Code slash commands
├── .env.example            # API key template
├── CLAUDE.md               # Full technical documentation
└── GETTING-STARTED.md      # This file
```

## Running Tests

```bash
cd app
npx vitest run    # 33 unit tests
```

## Troubleshooting

- **"No brand context"**: Run Step 1 first — scrape a brand via the web form or `/collect-brand`.
- **Apify timeout**: The Meta Ad Library scraper has a 240-second timeout. If it hangs, reduce ads-per-keyword count.
- **Images not loading**: Ad images are served via `/api/proxy-image`. Meta CDN URLs expire — images must be downloaded locally during scraping.
- **Build errors**: Run `cd app && npm install` to ensure all dependencies are installed.
