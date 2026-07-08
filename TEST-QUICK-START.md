# Pipeline Test - Quick Start

## TL;DR - Test Everything in 30 Seconds

```bash
cd app
npx tsx scripts/test-pipeline.ts
```

That's it! You'll see ✅ or ❌ for each component.

## What It Tests

1. **API Keys** - All 5 keys are configured
2. **YouTube Scraping** - Gets 2 videos with transcripts  
3. **YouTube Analysis** - AI extracts brand themes, tone, messaging
4. **Website Crawl** - FireCrawl scrapes 5 pages
5. **Brand Analysis** - Claude analyzes brand identity

## Test Specific Parts

```bash
# Just YouTube
npx tsx scripts/test-pipeline.ts youtube

# Just website/brand
npx tsx scripts/test-pipeline.ts brand
```

## Example Output

```
🎬 Testing YouTube Scraping...
✅ YouTube scraping successful (12.3s)
   Channel: Oleg Melnikov
   Videos found: 2
   Videos with transcripts: 2

🤖 Testing YouTube Content Analysis...
✅ YouTube analysis successful (8.5s)
   Brand Themes: AI tools, marketing, productivity
   Tone: Educational and practical
   Messaging: Transform your business with AI

📊 Test Summary
✅ API Keys
✅ YouTube Scraping
✅ YouTube Analysis
✅ Website Crawl
✅ Brand Analysis

5 passed, 0 failed ✅
```

## Common Errors

### "402 Payment Required"
Your Apify or Kie.ai credits ran out. Add more:
- Apify: https://console.apify.com/billing
- Kie.ai: https://kie.ai/

### "API Keys - NOT SET"
Missing `.env` file. Copy `.env.example` to `.env` and add your keys.

## Full Documentation

See `app/tests/README.md` for complete guide.
