import { describe, it, expect } from "vitest";
import { scoreAdvertisers, extractKeywords } from "@/lib/competitor-scoring";
import { MetaAdEntry, BrandContext } from "@/lib/types";

function makeAd(overrides: Partial<MetaAdEntry> = {}): MetaAdEntry {
  return {
    id: `ad-${Math.random().toString(36).slice(2)}`,
    advertiser: "TestBrand",
    headline: "Test headline",
    primaryText: "Test primary text for the ad",
    description: "Test description",
    ctaText: "Shop Now",
    imageUrl: "https://example.com/img.jpg",
    localImagePath: "competitor-ads/testbrand/ad1.jpg",
    videoUrl: "",
    linkUrl: "https://example.com",
    platforms: "facebook,instagram",
    startDate: "2025-01-01",
    isActive: true,
    daysRunning: 30,
    scrapedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeBrandContext(overrides: Partial<BrandContext> = {}): BrandContext {
  return {
    name: "TestBrand",
    description: "A test brand that sells supplements",
    category: "supplements",
    keywords: [],
    sources: [],
    collectedAt: new Date().toISOString(),
    collectedBy: "web-form",
    ...overrides,
  };
}

describe("scoreAdvertisers", () => {
  it("returns empty array for empty input", () => {
    expect(scoreAdvertisers([])).toEqual([]);
  });

  it("groups ads by advertiser and calculates scores", () => {
    const ads = [
      makeAd({ advertiser: "BrandA", daysRunning: 60, primaryText: "unique text A1" }),
      makeAd({ advertiser: "BrandA", daysRunning: 30, primaryText: "unique text A2" }),
      makeAd({ advertiser: "BrandB", daysRunning: 10, primaryText: "unique text B1" }),
    ];

    const result = scoreAdvertisers(ads);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("BrandA");
    expect(result[1].name).toBe("BrandB");
  });

  it("calculates correct metrics for an advertiser", () => {
    const ads = [
      makeAd({ advertiser: "BrandA", daysRunning: 60, isActive: true, primaryText: "text one" }),
      makeAd({ advertiser: "BrandA", daysRunning: 20, isActive: false, primaryText: "text two" }),
      makeAd({ advertiser: "BrandA", daysRunning: 40, isActive: true, primaryText: "text three" }),
    ];

    const result = scoreAdvertisers(ads);
    const brandA = result[0];

    expect(brandA.name).toBe("BrandA");
    expect(brandA.totalAds).toBe(3);
    expect(brandA.activeAds).toBe(2);
    expect(brandA.maxDaysRunning).toBe(60);
    expect(brandA.avgDaysRunning).toBe(40); // (60 + 20 + 40) / 3 = 40
    expect(brandA.creativeDiversity).toBe(3);
    expect(brandA.adIds).toHaveLength(3);
  });

  it("sorts advertisers by score descending", () => {
    const ads = [
      makeAd({ advertiser: "SmallBrand", daysRunning: 5, primaryText: "small text" }),
      makeAd({ advertiser: "BigBrand", daysRunning: 90, primaryText: "big text 1" }),
      makeAd({ advertiser: "BigBrand", daysRunning: 60, primaryText: "big text 2" }),
      makeAd({ advertiser: "BigBrand", daysRunning: 45, primaryText: "big text 3" }),
    ];

    const result = scoreAdvertisers(ads);

    expect(result[0].name).toBe("BigBrand");
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });

  it("deduplicates creatives by primaryText prefix", () => {
    const sameText = "This is a duplicate ad copy that appears under multiple ad IDs";
    const ads = [
      makeAd({ advertiser: "BrandA", primaryText: sameText, id: "ad-1" }),
      makeAd({ advertiser: "BrandA", primaryText: sameText, id: "ad-2" }),
      makeAd({ advertiser: "BrandA", primaryText: "different text", id: "ad-3" }),
    ];

    const result = scoreAdvertisers(ads);
    expect(result[0].creativeDiversity).toBe(2); // 2 unique, not 3
    expect(result[0].totalAds).toBe(3); // still counts all ads
  });

  it("applies correct scoring formula", () => {
    const ads = [
      makeAd({ advertiser: "BrandA", daysRunning: 100, primaryText: "unique 1" }),
      makeAd({ advertiser: "BrandA", daysRunning: 50, primaryText: "unique 2" }),
    ];

    const result = scoreAdvertisers(ads);
    const a = result[0];

    // score = (maxDaysRunning * 3) + (avgDaysRunning * 2) + (totalAds * 10) + (creativeDiversity * 5)
    const expectedScore = (100 * 3) + (75 * 2) + (2 * 10) + (2 * 5);
    expect(a.score).toBe(expectedScore);
  });
});

describe("extractKeywords", () => {
  it("returns brand keywords if set", () => {
    const ctx = makeBrandContext({ keywords: ["protein powder", "creatine"] });
    const result = extractKeywords(ctx);
    expect(result).toContain("protein powder");
    expect(result).toContain("creatine");
  });

  it("adds category to keywords", () => {
    const ctx = makeBrandContext({ keywords: [], category: "supplements" });
    const result = extractKeywords(ctx);
    expect(result).toContain("supplements");
  });

  it("extracts from description when no keywords or category", () => {
    const ctx = makeBrandContext({
      keywords: [],
      category: "",
      description: "We sell organic protein shakes and healthy smoothies for fitness enthusiasts",
    });
    const result = extractKeywords(ctx);
    expect(result.length).toBeGreaterThan(0);
    // Should extract words > 4 chars
    expect(result.some((k) => k.length > 4)).toBe(true);
  });

  it("falls back to brand name when nothing else available", () => {
    const ctx = makeBrandContext({
      keywords: [],
      category: "",
      description: "",
      name: "SuperFit",
    });
    const result = extractKeywords(ctx);
    expect(result).toContain("SuperFit");
  });

  it("deduplicates keywords", () => {
    const ctx = makeBrandContext({
      keywords: ["protein", "protein"],
      category: "protein",
    });
    const result = extractKeywords(ctx);
    const proteinCount = result.filter((k) => k === "protein").length;
    expect(proteinCount).toBe(1);
  });
});
