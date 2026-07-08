import { describe, it, expect } from "vitest";
import type {
  BrandContext,
  ScoredAdvertiser,
  SearchState,
  AnalysisResult,
  WinningPattern,
  HookAnalysis,
  QualityScore,
  AdConcept,
  MetaAdEntry,
} from "@/lib/types";

describe("Type contracts", () => {
  it("BrandContext has all required fields", () => {
    const ctx: BrandContext = {
      name: "Test",
      description: "Test brand",
      category: "test",
      keywords: ["test"],
      sources: [],
      collectedAt: new Date().toISOString(),
      collectedBy: "web-form",
    };
    expect(ctx.name).toBe("Test");
    expect(ctx.collectedBy).toBe("web-form");
  });

  it("BrandContext supports optional fields", () => {
    const ctx: BrandContext = {
      name: "Test",
      description: "Test brand",
      category: "test",
      keywords: [],
      sources: [],
      collectedAt: new Date().toISOString(),
      collectedBy: "claude-code",
      url: "https://example.com",
      tagline: "Best brand",
      colors: "blue, red",
      style: "modern",
      visualAnalysis: "Sleek modern aesthetic",
      instagramHandle: "testbrand",
      instagramFollowers: 10000,
      instagramProfilePicUrl: "https://example.com/pic.jpg",
      logoUrl: "https://example.com/logo.png",
      faviconUrl: "https://example.com/favicon.ico",
    };
    expect(ctx.url).toBe("https://example.com");
    expect(ctx.instagramFollowers).toBe(10000);
    expect(ctx.visualAnalysis).toBe("Sleek modern aesthetic");
  });

  it("ScoredAdvertiser has correct shape", () => {
    const adv: ScoredAdvertiser = {
      name: "BrandA",
      totalAds: 10,
      activeAds: 8,
      maxDaysRunning: 90,
      avgDaysRunning: 45,
      creativeDiversity: 6,
      score: 500,
      adIds: ["ad1", "ad2"],
    };
    expect(adv.score).toBe(500);
    expect(adv.adIds).toHaveLength(2);
  });

  it("SearchState has correct shape", () => {
    const state: SearchState = {
      keywords: ["protein"],
      searchedAt: new Date().toISOString(),
      advertisers: [],
      totalAdsScraped: 0,
    };
    expect(state.keywords).toEqual(["protein"]);
  });

  it("WinningPattern has all analysis fields", () => {
    const pattern: WinningPattern = {
      name: "Question Hook",
      frequency: 5,
      avgDaysRunning: 45,
      description: "Opens with a question",
      examples: [{ advertiser: "Brand1", adId: "ad1", excerpt: "Did you know?" }],
      hookType: "question",
      copyStructure: "short",
      emotionalAngle: "curiosity",
      offerType: "discount",
      visualApproach: "text-on-image",
    };
    expect(pattern.hookType).toBe("question");
    expect(pattern.examples).toHaveLength(1);
  });

  it("QualityScore has all evaluation fields", () => {
    const qc: QualityScore = {
      conceptId: "concept-1",
      brandConsistency: 8,
      copyQuality: 7,
      visualRelevance: 9,
      overallScore: 7.95,
      passed: true,
      feedback: "Good adaptation",
      evaluatedAt: new Date().toISOString(),
    };
    expect(qc.passed).toBe(true);
    expect(qc.overallScore).toBeGreaterThan(7);
  });

  it("AdConcept supports QC fields", () => {
    const concept: AdConcept = {
      id: "concept-1",
      headline: "Test",
      body: "Test body",
      description: "Desc",
      ctaText: "Shop Now",
      imagePrompt: "prompt",
      generatedImageUrl: "",
      referenceImageUrl: "",
      targetAudience: "general",
      format: "feed post",
      placements: "Facebook Feed",
      rationale: "test",
      productName: "Product A",
      inspirationAdIds: "ad1",
      starred: false,
      createdAt: new Date().toISOString(),
      qualityScore: 7.5,
      qualityFeedback: "Good concept",
      qcPassed: true,
    };
    expect(concept.qualityScore).toBe(7.5);
    expect(concept.qcPassed).toBe(true);
  });

  it("AdConcept QC fields are optional (backward compatible)", () => {
    const concept: AdConcept = {
      id: "concept-1",
      headline: "Test",
      body: "Test body",
      description: "",
      ctaText: "Shop Now",
      imagePrompt: "",
      generatedImageUrl: "",
      referenceImageUrl: "",
      targetAudience: "",
      format: "feed post",
      placements: "Facebook Feed",
      rationale: "",
      productName: "",
      inspirationAdIds: "",
      starred: false,
      createdAt: new Date().toISOString(),
    };
    expect(concept.qualityScore).toBeUndefined();
    expect(concept.qcPassed).toBeUndefined();
  });

  it("AnalysisResult has correct shape with hooks", () => {
    const result: AnalysisResult = {
      patterns: [],
      hooks: [],
      summary: "No patterns found",
      analyzedAt: new Date().toISOString(),
      totalAdsAnalyzed: 0,
    };
    expect(result.patterns).toEqual([]);
    expect(result.hooks).toEqual([]);
    expect(result.totalAdsAnalyzed).toBe(0);
  });

  it("HookAnalysis has all required fields", () => {
    const hook: HookAnalysis = {
      adId: "123456",
      advertiser: "TestBrand",
      hookText: "Is your skin aging faster than you think?",
      hookTechnique: "provocative rhetorical question challenging a common belief",
      hookVisual: "Bold white text on dark background with close-up of skin",
      whyItWorks: "Creates immediate anxiety about a personal concern, triggering curiosity gap",
      effectiveness: 9,
      isVideo: false,
    };
    expect(hook.effectiveness).toBe(9);
    expect(hook.effectiveness).toBeGreaterThanOrEqual(1);
    expect(hook.effectiveness).toBeLessThanOrEqual(10);
    expect(hook.isVideo).toBe(false);
    expect(hook.videoFirstSeconds).toBeUndefined();
  });

  it("HookAnalysis supports video first seconds", () => {
    const hook: HookAnalysis = {
      adId: "789",
      advertiser: "VideoBrand",
      hookText: "Wait until you see this...",
      hookTechnique: "curiosity gap with pattern interrupt",
      hookVisual: "Person holding product with shocked expression",
      whyItWorks: "Pattern interrupt + curiosity gap combo",
      effectiveness: 8,
      isVideo: true,
      videoFirstSeconds: "0-1s: Close-up of hand squeezing product. 1-3s: Person's surprised reaction. 3-5s: Text overlay 'This changes everything'",
    };
    expect(hook.isVideo).toBe(true);
    expect(hook.videoFirstSeconds).toBeDefined();
  });

  it("WinningPattern supports hookAnalysis field", () => {
    const pattern: WinningPattern = {
      name: "Question Hook",
      frequency: 5,
      avgDaysRunning: 45,
      description: "Opens with a question",
      examples: [{ advertiser: "Brand1", adId: "ad1", excerpt: "Did you know?" }],
      hookType: "question",
      copyStructure: "short",
      emotionalAngle: "curiosity",
      offerType: "discount",
      visualApproach: "text-on-image",
      hookAnalysis: "The question hooks in this pattern work by...",
    };
    expect(pattern.hookAnalysis).toBeDefined();
  });

  it("MetaAdEntry has all expected fields", () => {
    const ad: MetaAdEntry = {
      id: "ad-1",
      advertiser: "Brand",
      headline: "Headline",
      primaryText: "Body text",
      description: "Desc",
      ctaText: "Shop Now",
      imageUrl: "https://example.com/img.jpg",
      localImagePath: "competitor-ads/brand/ad-1.jpg",
      videoUrl: "",
      linkUrl: "https://example.com",
      platforms: "facebook,instagram",
      startDate: "2025-01-01",
      isActive: true,
      daysRunning: 30,
      scrapedAt: new Date().toISOString(),
    };
    expect(ad.daysRunning).toBe(30);
    expect(ad.isActive).toBe(true);
  });
});
