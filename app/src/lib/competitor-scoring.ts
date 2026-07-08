import { MetaAdEntry, ScoredAdvertiser, BrandContext } from "./types";

export function scoreAdvertisers(ads: MetaAdEntry[]): ScoredAdvertiser[] {
  const groups = new Map<string, MetaAdEntry[]>();

  for (const ad of ads) {
    const name = ad.advertiser;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name)!.push(ad);
  }

  const scored: ScoredAdvertiser[] = [];

  for (const [name, advAds] of groups) {
    const totalAds = advAds.length;
    const activeAds = advAds.filter((a) => a.isActive).length;
    const daysValues = advAds.map((a) => a.daysRunning).filter((d) => d > 0);
    const maxDaysRunning = daysValues.length > 0 ? Math.max(...daysValues) : 0;
    const avgDaysRunning = daysValues.length > 0
      ? Math.round(daysValues.reduce((a, b) => a + b, 0) / daysValues.length)
      : 0;

    const seen = new Set<string>();
    for (const ad of advAds) {
      const key = ad.primaryText.slice(0, 100).trim();
      if (key) seen.add(key);
    }
    const creativeDiversity = seen.size;

    const score =
      (maxDaysRunning * 3) +
      (avgDaysRunning * 2) +
      (totalAds * 10) +
      (creativeDiversity * 5);

    scored.push({
      name,
      totalAds,
      activeAds,
      maxDaysRunning,
      avgDaysRunning,
      creativeDiversity,
      score,
      adIds: advAds.map((a) => a.id),
    });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function extractKeywords(brandContext: BrandContext): string[] {
  const keywords: string[] = [];

  if (brandContext.keywords && brandContext.keywords.length > 0) {
    keywords.push(...brandContext.keywords);
  }

  if (brandContext.category) {
    keywords.push(brandContext.category);
  }

  if (keywords.length === 0 && brandContext.description) {
    const words = brandContext.description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4);
    const unique = [...new Set(words)].slice(0, 4);
    keywords.push(...unique);
  }

  if (keywords.length === 0 && brandContext.name) {
    keywords.push(brandContext.name);
  }

  return [...new Set(keywords)];
}
