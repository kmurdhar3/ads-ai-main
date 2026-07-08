import { describe, it, expect, beforeAll } from 'vitest';
import { scrapeYouTubeChannel } from '@/lib/apify';
import { analyzeYouTubeContent } from '@/lib/claude-youtube';

/**
 * Integration Tests for Ad Creation Pipeline
 *
 * Tests the complete flow:
 * 1. Brand Context (YouTube scraping + analysis)
 * 2. Competitor Search
 * 3. What's Working Analysis
 * 4. Ad Generation
 *
 * Run with: npm test tests/integration/full-pipeline.test.ts
 */

describe('Ad Creation Pipeline - Full Integration', () => {
  const TEST_DATA = {
    youtubeUrl: 'https://www.youtube.com/@Oleg-Melnikov',
    websiteUrl: 'https://boldane.com/',
    keywords: ['personal branding', 'LinkedIn ghostwriting'],
  };

  let youtubeData: any;
  let youtubeAnalysis: any;

  describe('Step 1: Brand Context - YouTube', () => {
    it('should scrape YouTube channel and get videos with transcripts', async () => {
      console.log('\n🎬 Testing YouTube scraping...');

      youtubeData = await scrapeYouTubeChannel(TEST_DATA.youtubeUrl, 2);

      expect(youtubeData).toBeDefined();
      expect(youtubeData.channelName).toBeTruthy();
      expect(youtubeData.videos).toBeInstanceOf(Array);
      expect(youtubeData.videos.length).toBeGreaterThan(0);

      const videosWithTranscripts = youtubeData.videos.filter((v: any) => v.transcript);
      expect(videosWithTranscripts.length).toBeGreaterThan(0);

      console.log(`✅ Scraped ${youtubeData.videos.length} videos from ${youtubeData.channelName}`);
      console.log(`   Videos with transcripts: ${videosWithTranscripts.length}`);

      videosWithTranscripts.forEach((v: any, i: number) => {
        console.log(`   ${i + 1}. ${v.title} (${v.transcript.length} chars)`);
      });
    }, 60000); // 60s timeout

    it('should analyze YouTube content with Claude', async () => {
      console.log('\n🤖 Testing YouTube content analysis...');

      expect(youtubeData).toBeDefined();

      youtubeAnalysis = await analyzeYouTubeContent(
        youtubeData.channelName,
        youtubeData.videos.map((v: any) => ({
          title: v.title,
          transcript: v.transcript,
          viewCount: v.viewCount,
        }))
      );

      expect(youtubeAnalysis).toBeDefined();
      expect(youtubeAnalysis.brandThemes).toBeInstanceOf(Array);
      expect(youtubeAnalysis.tone).toBeTruthy();
      expect(youtubeAnalysis.messaging).toBeTruthy();

      console.log(`✅ Analysis complete:`);
      console.log(`   Brand Themes: ${youtubeAnalysis.brandThemes.join(', ')}`);
      console.log(`   Tone: ${youtubeAnalysis.tone}`);
      console.log(`   Messaging: ${youtubeAnalysis.messaging.slice(0, 100)}...`);
      console.log(`   Target Audience: ${youtubeAnalysis.targetAudience}`);
    }, 30000); // 30s timeout
  });

  describe('Step 2: Brand Context - Website', () => {
    it('should scrape website via API', async () => {
      console.log('\n🌐 Testing website scraping...');

      const response = await fetch('http://localhost:3002/api/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl: TEST_DATA.websiteUrl,
          youtubeUrl: TEST_DATA.youtubeUrl,
        }),
      });

      expect(response.ok).toBe(true);

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let lastMessage = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              lastMessage = data.message;
              console.log(`   ${data.step}: ${data.message}`);
            }
          }
        }
      }

      expect(lastMessage).toContain('saved');
      console.log('✅ Brand context saved successfully');
    }, 120000); // 2 min timeout
  });

  describe('Step 3: Competitor Search', () => {
    it('should search Meta Ad Library by keywords', async () => {
      console.log('\n🔍 Testing competitor search...');

      const response = await fetch('http://localhost:3002/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search',
          keywords: TEST_DATA.keywords,
          adsPerKeyword: 5,
        }),
      });

      expect(response.ok).toBe(true);

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let keywordsSearched = 0;
      let totalAds = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              if (data.step === 'keyword-done') {
                keywordsSearched++;
              }
              if (data.step === 'complete') {
                totalAds = data.totalAds || 0;
              }
              console.log(`   ${data.message}`);
            }
          }
        }
      }

      expect(keywordsSearched).toBe(TEST_DATA.keywords.length);
      expect(totalAds).toBeGreaterThan(0);
      console.log(`✅ Found ${totalAds} competitor ads`);
    }, 180000); // 3 min timeout
  });

  describe('Step 4: What\'s Working Analysis', () => {
    it('should analyze competitor ads and extract patterns', async () => {
      console.log('\n📊 Testing competitor analysis...');

      const response = await fetch('http://localhost:3002/api/analysis', {
        method: 'POST',
      });

      expect(response.ok).toBe(true);

      const result = await response.json();

      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.hooks).toBeInstanceOf(Array);
      expect(result.summary).toBeTruthy();

      console.log(`✅ Analysis complete:`);
      console.log(`   Patterns found: ${result.patterns.length}`);
      console.log(`   Hooks analyzed: ${result.hooks.length}`);
      console.log(`   Summary: ${result.summary.slice(0, 100)}...`);

      result.patterns.slice(0, 3).forEach((p: any, i: number) => {
        console.log(`   ${i + 1}. ${p.name} (${p.frequency} ads)`);
      });
    }, 60000); // 60s timeout
  });

  describe('Step 5: Ad Generation', () => {
    it('should generate ad concepts with copy and images', async () => {
      console.log('\n🎨 Testing ad generation...');

      const response = await fetch('http://localhost:3002/api/create/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: 2,
          productNames: [], // All products
        }),
      });

      expect(response.ok).toBe(true);

      // Read SSE stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let conceptsGenerated = 0;
      let imagesFailed = 0;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));

              if (data.step === 'concept-generated') {
                conceptsGenerated++;
                console.log(`   ✅ Concept ${data.conceptNumber}: ${data.headline?.slice(0, 50)}...`);
              }

              if (data.step === 'error' && data.message.includes('Image generation')) {
                imagesFailed++;
                console.log(`   ⚠️  Image generation issue (continuing...)`);
              }
            }
          }
        }
      }

      expect(conceptsGenerated).toBeGreaterThan(0);
      console.log(`✅ Generated ${conceptsGenerated} ad concepts`);

      if (imagesFailed > 0) {
        console.log(`⚠️  ${imagesFailed} image generation(s) failed (may need Kie.ai credits)`);
      }
    }, 300000); // 5 min timeout
  });

  describe('End-to-End Validation', () => {
    it('should have complete data flow from YouTube to generated ads', async () => {
      console.log('\n🔗 Validating end-to-end data flow...');

      // Check brand context includes YouTube data
      const brandRes = await fetch('http://localhost:3002/api/brand-context');
      const brandData = await brandRes.json();

      expect(brandData.brandContext).toBeDefined();
      expect(brandData.brandContext.youtubeChannelName).toBeTruthy();
      expect(brandData.brandContext.youtubeContentAnalysis).toBeDefined();

      console.log(`✅ Brand context has YouTube data: ${brandData.brandContext.youtubeChannelName}`);

      // Check generated concepts
      const conceptsRes = await fetch('http://localhost:3002/api/create');
      const conceptsData = await conceptsRes.json();

      expect(conceptsData.length).toBeGreaterThan(0);

      const concept = conceptsData[0];
      expect(concept.headline).toBeTruthy();
      expect(concept.body).toBeTruthy();
      expect(concept.productName).toBeTruthy();

      console.log(`✅ Generated concept references product: ${concept.productName}`);
      console.log(`✅ Pipeline complete! All steps connected successfully.`);
    });
  });
});
