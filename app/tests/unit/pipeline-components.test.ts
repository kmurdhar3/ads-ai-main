import { describe, it, expect } from 'vitest';
import { scrapeYouTubeChannel } from '@/lib/apify';
import { analyzeYouTubeContent } from '@/lib/claude-youtube';

/**
 * Unit Tests for Pipeline Components
 *
 * Tests individual functions without requiring full server
 *
 * Run with: npm test tests/unit/pipeline-components.test.ts
 */

describe('Pipeline Components - Unit Tests', () => {
  describe('YouTube Scraping', () => {
    it('should scrape YouTube channel and return structured data', async () => {
      const result = await scrapeYouTubeChannel('https://www.youtube.com/@Oleg-Melnikov', 2);

      expect(result).toBeDefined();
      expect(result.channelName).toBeTruthy();
      expect(result.channelUrl).toBeTruthy();
      expect(result.videos).toBeInstanceOf(Array);

      console.log(`\n✅ YouTube scraping works`);
      console.log(`   Channel: ${result.channelName}`);
      console.log(`   Videos: ${result.videos.length}`);

      if (result.videos.length > 0) {
        const withTranscripts = result.videos.filter(v => v.transcript);
        console.log(`   With transcripts: ${withTranscripts.length}`);

        expect(withTranscripts.length).toBeGreaterThan(0);
      }
    }, 30000);
  });

  describe('YouTube Content Analysis', () => {
    it('should analyze video transcripts and extract brand insights', async () => {
      const mockVideos = [
        {
          title: 'How to Build High-Converting Landing Pages',
          transcript: 'I built this website using Claude Code just a week ago. The trick was giving it a knowledge base from Alex Hormozi about building landing pages that convert. By the end of this video, you will be able to build a similar website and increase your revenue by 10%.',
          viewCount: 50000,
        },
      ];

      const result = await analyzeYouTubeContent('Oleg Melnikov', mockVideos);

      expect(result).toBeDefined();
      expect(result.brandThemes).toBeInstanceOf(Array);
      expect(result.tone).toBeTruthy();
      expect(result.messaging).toBeTruthy();
      expect(result.targetAudience).toBeTruthy();

      console.log(`\n✅ YouTube content analysis works`);
      console.log(`   Themes: ${result.brandThemes.join(', ')}`);
      console.log(`   Tone: ${result.tone}`);
      console.log(`   Audience: ${result.targetAudience}`);
    }, 30000);
  });

  describe('Data Validation', () => {
    it('should have valid API keys configured', () => {
      const keys = {
        APIFY_API_TOKEN: process.env.APIFY_API_TOKEN,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY,
        KIE_AI_API_KEY: process.env.KIE_AI_API_KEY,
      };

      Object.entries(keys).forEach(([name, value]) => {
        expect(value).toBeDefined();
        expect(value).not.toBe('');
        console.log(`✅ ${name} is configured`);
      });
    });
  });
});
