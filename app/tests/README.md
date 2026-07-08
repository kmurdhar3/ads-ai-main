# Pipeline Testing Guide

This directory contains tests for the ad creation pipeline.

## Quick Start

### Option 1: Standalone Script (Recommended)

Run the complete pipeline test without starting the dev server:

```bash
# Test everything
npx tsx scripts/test-pipeline.ts

# Test only YouTube scraping + analysis
npx tsx scripts/test-pipeline.ts youtube

# Test only website crawl + brand analysis
npx tsx scripts/test-pipeline.ts brand
```

**What it tests:**
- ✅ API keys are configured
- ✅ YouTube channel scraping (gets videos with transcripts)
- ✅ YouTube content analysis (extracts brand themes, tone, messaging)
- ✅ Website crawling (FireCrawl integration)
- ✅ Brand identity analysis (Claude AI)

**Output:**
```
🎬 Testing YouTube Scraping...
✅ YouTube scraping successful (12.3s)
   Channel: Oleg Melnikov
   Videos found: 2
   Videos with transcripts: 2
   
🤖 Testing YouTube Content Analysis...
✅ YouTube analysis successful (8.5s)
   Brand Themes: AI, marketing, productivity
   Tone: Educational and practical
   ...

📊 Test Summary
✅ API Keys
✅ YouTube Scraping
✅ YouTube Analysis
✅ Website Crawl
✅ Brand Analysis

5 passed, 0 failed
```

### Option 2: Unit Tests (Fast)

Test individual components without network calls:

```bash
npm test tests/unit/pipeline-components.test.ts
```

### Option 3: Integration Tests (Requires Dev Server)

Test the full flow via API endpoints:

```bash
# Start dev server in one terminal
npm run dev

# Run integration tests in another terminal
npm test tests/integration/full-pipeline.test.ts
```

**What it tests:**
- Step 1: Brand Context (YouTube + Website scraping)
- Step 2: Competitor Search (Meta Ad Library)
- Step 3: What's Working (Pattern analysis)
- Step 4: Ad Generation (Copy + Images)
- End-to-end data flow validation

## Test Files

```
tests/
├── unit/
│   └── pipeline-components.test.ts   # Unit tests for individual functions
├── integration/
│   └── full-pipeline.test.ts         # Full API integration tests
└── README.md                          # This file

scripts/
└── test-pipeline.ts                   # Standalone test script (no server needed)
```

## Configuration

Tests use these values from `.env`:

```bash
APIFY_API_TOKEN=your_token
ANTHROPIC_API_KEY=your_key
FIRECRAWL_API_KEY=your_key
KIE_AI_API_KEY=your_key
GEMINI_API_KEY=your_key
```

## Common Issues

### "402 Payment Required"
- **Apify**: Out of credits → Add credits at https://console.apify.com/billing
- **Kie.ai**: Out of credits → Add credits at https://kie.ai/

### "YouTube scraping failed"
- Check Apify token is valid
- Ensure you have credits
- Try with a different YouTube channel URL

### "Image generation timed out"
- Kie.ai can take 2-4 minutes per image
- Check if Kie.ai has sufficient credits
- Try running with fewer concepts

## Timeouts

Different tests have different timeouts based on expected duration:

- YouTube scraping: 30s
- YouTube analysis: 30s
- Website crawl: 120s (2 min)
- Competitor search: 180s (3 min)
- Ad generation: 300s (5 min)

## CI/CD Integration

To run tests in CI/CD:

```yaml
# .github/workflows/test.yml
- name: Run Pipeline Tests
  run: npx tsx scripts/test-pipeline.ts
  env:
    APIFY_API_TOKEN: ${{ secrets.APIFY_API_TOKEN }}
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    FIRECRAWL_API_KEY: ${{ secrets.FIRECRAWL_API_KEY }}
```

## Debugging

Add `console.log` statements in the test files to see detailed output:

```typescript
console.log('YouTube data:', JSON.stringify(youtubeData, null, 2));
```

Or run with verbose logging:

```bash
DEBUG=* npx tsx scripts/test-pipeline.ts
```
