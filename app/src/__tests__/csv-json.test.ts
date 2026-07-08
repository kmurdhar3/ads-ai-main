import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  readBrandContext,
  writeBrandContext,
  readSearchState,
  writeSearchState,
  readAnalysis,
  writeAnalysis,
  readJson,
  writeJson,
} from "@/lib/csv";
import { BrandContext, SearchState, AnalysisResult } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "..", "data");

function cleanupTestFiles() {
  const testFiles = [
    "brand-context.json.test-backup",
    "search-results.json.test-backup",
    "analysis.json.test-backup",
    "_test_file.json",
  ];
  for (const f of testFiles) {
    const fp = path.join(DATA_DIR, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
}

function backupAndRemove(filename: string) {
  const fp = path.join(DATA_DIR, filename);
  const backup = fp + ".test-backup";
  if (fs.existsSync(fp)) {
    fs.copyFileSync(fp, backup);
    fs.unlinkSync(fp);
  }
  return backup;
}

function restore(filename: string) {
  const fp = path.join(DATA_DIR, filename);
  const backup = fp + ".test-backup";
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, fp);
    fs.unlinkSync(backup);
  } else if (fs.existsSync(fp)) {
    fs.unlinkSync(fp);
  }
}

describe("JSON read/write helpers", () => {
  afterEach(() => {
    const fp = path.join(DATA_DIR, "_test_file.json");
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  });

  it("readJson returns null for nonexistent file", () => {
    const result = readJson<{ foo: string }>("_nonexistent_test_file.json");
    expect(result).toBeNull();
  });

  it("writeJson + readJson round-trips data", async () => {
    const data = { name: "test", value: 42, nested: { a: true } };
    await writeJson("_test_file.json", data);
    const result = readJson<typeof data>("_test_file.json");
    expect(result).toEqual(data);
  });

  it("writeJson creates valid JSON", async () => {
    await writeJson("_test_file.json", { hello: "world" });
    const fp = path.join(DATA_DIR, "_test_file.json");
    const raw = fs.readFileSync(fp, "utf-8");
    expect(() => JSON.parse(raw)).not.toThrow();
    expect(JSON.parse(raw)).toEqual({ hello: "world" });
  });
});

describe("readBrandContext / writeBrandContext", () => {
  let hadExisting = false;

  beforeEach(() => {
    const fp = path.join(DATA_DIR, "brand-context.json");
    hadExisting = fs.existsSync(fp);
    if (hadExisting) backupAndRemove("brand-context.json");
  });

  afterEach(() => {
    if (hadExisting) {
      restore("brand-context.json");
    } else {
      const fp = path.join(DATA_DIR, "brand-context.json");
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  });

  it("returns null when no brand context exists", () => {
    expect(readBrandContext()).toBeNull();
  });

  it("round-trips a full BrandContext", async () => {
    const ctx: BrandContext = {
      name: "TestBrand",
      url: "https://testbrand.com",
      description: "A test brand for unit tests",
      tagline: "Testing is believing",
      category: "testing",
      keywords: ["unit test", "vitest"],
      colors: "blue, white",
      style: "modern, clean",
      instagramHandle: "testbrand",
      instagramFollowers: 5000,
      sources: [
        { type: "website", url: "https://testbrand.com", description: "Main site" },
      ],
      collectedAt: "2026-05-28T00:00:00Z",
      collectedBy: "web-form",
    };

    await writeBrandContext(ctx);
    const result = readBrandContext();

    expect(result).not.toBeNull();
    expect(result!.name).toBe("TestBrand");
    expect(result!.keywords).toEqual(["unit test", "vitest"]);
    expect(result!.instagramFollowers).toBe(5000);
    expect(result!.collectedBy).toBe("web-form");
    expect(result!.sources).toHaveLength(1);
  });
});

describe("readSearchState / writeSearchState", () => {
  let hadExisting = false;

  beforeEach(() => {
    const fp = path.join(DATA_DIR, "search-results.json");
    hadExisting = fs.existsSync(fp);
    if (hadExisting) backupAndRemove("search-results.json");
  });

  afterEach(() => {
    if (hadExisting) {
      restore("search-results.json");
    } else {
      const fp = path.join(DATA_DIR, "search-results.json");
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  });

  it("returns null when no search state exists", () => {
    expect(readSearchState()).toBeNull();
  });

  it("round-trips search state with advertisers", async () => {
    const state: SearchState = {
      keywords: ["protein powder", "supplements"],
      searchedAt: "2026-05-28T00:00:00Z",
      advertisers: [
        {
          name: "FitBrand",
          totalAds: 15,
          activeAds: 10,
          maxDaysRunning: 90,
          avgDaysRunning: 45,
          creativeDiversity: 8,
          score: 500,
          adIds: ["ad1", "ad2"],
        },
      ],
      totalAdsScraped: 50,
    };

    await writeSearchState(state);
    const result = readSearchState();

    expect(result).not.toBeNull();
    expect(result!.keywords).toEqual(["protein powder", "supplements"]);
    expect(result!.advertisers).toHaveLength(1);
    expect(result!.advertisers[0].name).toBe("FitBrand");
    expect(result!.advertisers[0].score).toBe(500);
    expect(result!.totalAdsScraped).toBe(50);
  });
});

describe("readAnalysis / writeAnalysis", () => {
  let hadExisting = false;

  beforeEach(() => {
    const fp = path.join(DATA_DIR, "analysis.json");
    hadExisting = fs.existsSync(fp);
    if (hadExisting) backupAndRemove("analysis.json");
  });

  afterEach(() => {
    if (hadExisting) {
      restore("analysis.json");
    } else {
      const fp = path.join(DATA_DIR, "analysis.json");
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  });

  it("returns null when no analysis exists", () => {
    expect(readAnalysis()).toBeNull();
  });

  it("round-trips analysis result with patterns", async () => {
    const analysis: AnalysisResult = {
      patterns: [
        {
          name: "Question Hook + Social Proof",
          frequency: 5,
          avgDaysRunning: 45,
          description: "Opens with a question, follows with testimonial",
          examples: [
            { advertiser: "Brand1", adId: "ad1", excerpt: "Did you know..." },
          ],
          hookType: "question",
          copyStructure: "short with testimonial",
          emotionalAngle: "curiosity + trust",
          offerType: "discount",
          visualApproach: "text-on-image",
        },
      ],
      hooks: [
        {
          adId: "ad1",
          advertiser: "Brand1",
          hookText: "Did you know your gut affects your mood?",
          hookTechnique: "provocative question",
          hookVisual: "Bold white text on dark green background",
          whyItWorks: "Creates curiosity gap about a personal topic",
          effectiveness: 8,
          isVideo: false,
        },
      ],
      summary: "Question hooks dominate the top performers",
      analyzedAt: "2026-05-28T00:00:00Z",
      totalAdsAnalyzed: 30,
    };

    await writeAnalysis(analysis);
    const result = readAnalysis();

    expect(result).not.toBeNull();
    expect(result!.patterns).toHaveLength(1);
    expect(result!.patterns[0].name).toBe("Question Hook + Social Proof");
    expect(result!.patterns[0].examples).toHaveLength(1);
    expect(result!.totalAdsAnalyzed).toBe(30);
  });
});
