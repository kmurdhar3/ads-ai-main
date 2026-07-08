#!/usr/bin/env tsx
/**
 * Standalone Pipeline Test Script
 *
 * Tests the complete ad creation pipeline without requiring the dev server
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts
 *
 * Or run specific steps:
 *   npx tsx scripts/test-pipeline.ts youtube
 *   npx tsx scripts/test-pipeline.ts brand
 *   npx tsx scripts/test-pipeline.ts all
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from parent directory
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✓ Loaded environment from ${envPath}\n`);
} else {
  console.log(`⚠️  No .env file found at ${envPath}\n`);
}

import { scrapeYouTubeChannel } from '../src/lib/apify';
import { analyzeYouTubeContent } from '../src/lib/claude-youtube';
import { crawlWebsite, extractBrandProfile } from '../src/lib/firecrawl';
import { analyzeBrandIdentity } from '../src/lib/claude';

const TEST_CONFIG = {
  youtubeUrl: 'https://www.youtube.com/@Oleg-Melnikov',
  websiteUrl: 'https://boldane.com/',
  maxVideos: 2,
  maxPages: 5,
};

async function testYouTubeScraping() {
  console.log('🎬 Testing YouTube Scraping...\n');

  try {
    const startTime = Date.now();
    const result = await scrapeYouTubeChannel(TEST_CONFIG.youtubeUrl, TEST_CONFIG.maxVideos);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ YouTube scraping successful (${duration}s)`);
    console.log(`   Channel: ${result.channelName}`);
    console.log(`   Videos found: ${result.videos.length}`);

    const withTranscripts = result.videos.filter(v => v.transcript);
    console.log(`   Videos with transcripts: ${withTranscripts.length}\n`);

    if (withTranscripts.length === 0) {
      console.log('⚠️  No transcripts found - analysis will be limited\n');
      return { success: false, data: result, error: 'No transcripts' };
    }

    withTranscripts.forEach((v, i) => {
      console.log(`   ${i + 1}. ${v.title}`);
      console.log(`      Views: ${v.viewCount.toLocaleString()}`);
      console.log(`      Transcript: ${v.transcript?.length.toLocaleString() || 0} characters\n`);
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('❌ YouTube scraping failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testYouTubeAnalysis(youtubeData: any) {
  console.log('🤖 Testing YouTube Content Analysis...\n');

  try {
    const startTime = Date.now();
    const result = await analyzeYouTubeContent(
      youtubeData.channelName,
      youtubeData.videos.map((v: any) => ({
        title: v.title,
        transcript: v.transcript,
        viewCount: v.viewCount,
      }))
    );
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ YouTube analysis successful (${duration}s)\n`);

    console.log('📊 Analysis Results:');
    console.log(`   Brand Themes: ${result.brandThemes.join(', ')}`);
    console.log(`   Tone: ${result.tone}`);
    console.log(`   Messaging: ${result.messaging}`);
    console.log(`   Target Audience: ${result.targetAudience}`);
    console.log(`   Content Style: ${result.contentStyle}`);
    console.log(`   Key Topics: ${result.keyTopics.join(', ')}\n`);

    return { success: true, data: result };
  } catch (error: any) {
    console.error('❌ YouTube analysis failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testWebsiteCrawl() {
  console.log('🌐 Testing Website Crawl...\n');

  try {
    const startTime = Date.now();
    const result = await crawlWebsite(TEST_CONFIG.websiteUrl, TEST_CONFIG.maxPages);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Website crawl successful (${duration}s)`);
    console.log(`   Pages crawled: ${result.pages.length}`);

    const brandProfile = extractBrandProfile(result.pages, TEST_CONFIG.websiteUrl);
    console.log(`   Brand name: ${brandProfile.name}`);
    console.log(`   Description: ${brandProfile.description.slice(0, 100)}...\n`);

    return { success: true, data: { crawl: result, profile: brandProfile } };
  } catch (error: any) {
    console.error('❌ Website crawl failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testBrandAnalysis(crawlData: any) {
  console.log('🔍 Testing Brand Identity Analysis...\n');

  try {
    const allContent = crawlData.pages
      .map((p: any) => p.markdown || '')
      .join('\n\n');

    const startTime = Date.now();
    const result = await analyzeBrandIdentity(allContent, '', TEST_CONFIG.websiteUrl);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`✅ Brand analysis successful (${duration}s)\n`);

    console.log('📊 Brand Identity:');
    console.log(`   Name: ${result.name}`);
    console.log(`   Tagline: ${result.tagline}`);
    console.log(`   Description: ${result.description.slice(0, 100)}...`);
    console.log(`   Colors: ${result.colors}`);
    console.log(`   Style: ${result.style}\n`);

    return { success: true, data: result };
  } catch (error: any) {
    console.error('❌ Brand analysis failed:', error.message);
    return { success: false, error: error.message };
  }
}

async function testAPIKeys() {
  console.log('🔑 Testing API Keys...\n');

  const keys = {
    APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
    KIE_AI_API_KEY: process.env.KIE_AI_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  };

  let allPresent = true;

  Object.entries(keys).forEach(([name, value]) => {
    if (value && value !== '') {
      console.log(`✅ ${name}`);
    } else {
      console.log(`❌ ${name} - NOT SET`);
      allPresent = false;
    }
  });

  console.log('');
  return allPresent;
}

async function runTests(testName: string = 'all') {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║     Ad Pipeline Integration Test          ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  const results: any = {
    apiKeys: false,
    youtube: false,
    youtubeAnalysis: false,
    website: false,
    brandAnalysis: false,
  };

  // Test API keys first
  results.apiKeys = await testAPIKeys();
  if (!results.apiKeys) {
    console.log('⚠️  Some API keys are missing. Tests may fail.\n');
  }

  if (testName === 'youtube' || testName === 'all') {
    // Test YouTube scraping
    const youtubeResult = await testYouTubeScraping();
    results.youtube = youtubeResult.success;

    // Test YouTube analysis if scraping succeeded
    if (youtubeResult.success && youtubeResult.data?.videos && youtubeResult.data.videos.length > 0) {
      const analysisResult = await testYouTubeAnalysis(youtubeResult.data);
      results.youtubeAnalysis = analysisResult.success;
    }
  }

  if (testName === 'brand' || testName === 'all') {
    // Test website crawl
    const websiteResult = await testWebsiteCrawl();
    results.website = websiteResult.success;

    // Test brand analysis if crawl succeeded
    if (websiteResult.success && websiteResult.data?.crawl) {
      const brandResult = await testBrandAnalysis(websiteResult.data.crawl);
      results.brandAnalysis = brandResult.success;
    }
  }

  // Print summary
  console.log('═══════════════════════════════════════════');
  console.log('📊 Test Summary\n');

  const tests = [
    { name: 'API Keys', result: results.apiKeys },
    { name: 'YouTube Scraping', result: results.youtube },
    { name: 'YouTube Analysis', result: results.youtubeAnalysis },
    { name: 'Website Crawl', result: results.website },
    { name: 'Brand Analysis', result: results.brandAnalysis },
  ];

  tests.forEach(test => {
    if (test.result === true) {
      console.log(`✅ ${test.name}`);
    } else if (test.result === false) {
      console.log(`❌ ${test.name}`);
    } else {
      console.log(`⊘  ${test.name} (skipped)`);
    }
  });

  const passed = Object.values(results).filter(r => r === true).length;
  const failed = Object.values(results).filter(r => r === false).length;

  console.log(`\n${passed} passed, ${failed} failed\n`);

  if (failed === 0) {
    console.log('✅ All tests passed! Pipeline is working correctly.\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the errors above.\n');
    process.exit(1);
  }
}

// Run tests
const testName = process.argv[2] || 'all';
runTests(testName);
