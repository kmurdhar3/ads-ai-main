import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import fs from "fs";
import path from "path";
import {
  Brand,
  Product,
  KnowledgeEntry,
  AdConcept,
  Source,
  MetaAdEntry,
  BrandContext,
  SearchState,
  AnalysisResult,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "..", "data");

let writeLock = Promise.resolve();

function withWriteLock<T>(fn: () => T): Promise<T> {
  const next = writeLock.then(fn, fn);
  writeLock = next.then(
    () => {},
    () => {}
  );
  return next;
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(name: string) {
  return path.join(DATA_DIR, name);
}

// === JSON read/write helpers ===

export function readJson<T>(filename: string): T | null {
  ensureDataDir();
  const fp = filePath(filename);
  if (!fs.existsSync(fp)) return null;
  try {
    const content = fs.readFileSync(fp, "utf-8").trim();
    if (!content) return null;
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function writeJson<T>(filename: string, data: T): Promise<void> {
  return withWriteLock(() => {
    ensureDataDir();
    const fp = filePath(filename);
    const tmpFp = fp + ".tmp";
    fs.writeFileSync(tmpFp, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFp, fp);
  });
}

export function readBrandContext(): BrandContext | null {
  return readJson<BrandContext>("brand-context.json");
}

export async function writeBrandContext(ctx: BrandContext): Promise<void> {
  return writeJson("brand-context.json", ctx);
}

export function readSearchState(): SearchState | null {
  return readJson<SearchState>("search-results.json");
}

export async function writeSearchState(state: SearchState): Promise<void> {
  return writeJson("search-results.json", state);
}

export function readAnalysis(): AnalysisResult | null {
  return readJson<AnalysisResult>("analysis.json");
}

export async function writeAnalysis(analysis: AnalysisResult): Promise<void> {
  return writeJson("analysis.json", analysis);
}

// === CSV read/write ===

export function readCsv<T>(filename: string): T[] {
  ensureDataDir();
  const fp = filePath(filename);
  if (!fs.existsSync(fp)) return [];
  const content = fs.readFileSync(fp, "utf-8").trim();
  if (!content) return [];
  try {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      cast: (value: string, context: { header: boolean }) => {
        if (context.header) return value;
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      },
    }) as T[];
  } catch {
    return [];
  }
}

function writeCsvSync<T extends Record<string, unknown>>(
  filename: string,
  records: T[],
  columns: string[]
) {
  ensureDataDir();
  const fp = filePath(filename);
  const tmpFp = fp + ".tmp";
  const output = stringify(records, { header: true, columns });
  fs.writeFileSync(tmpFp, output);
  fs.renameSync(tmpFp, fp);
}

// Legacy brand CSV — kept for migration
const brandColumns = [
  "name", "url", "description", "tagline", "products", "colors",
  "logoUrl", "faviconUrl", "style", "instagramHandle", "instagramFollowers",
  "instagramProfilePicUrl",
];

export function readBrand(): Brand | null {
  const rows = readCsv<Brand>("brand.csv");
  return rows.length > 0 ? rows[0] : null;
}

export function writeBrand(brand: Brand) {
  return withWriteLock(() =>
    writeCsvSync("brand.csv", [brand] as unknown as Record<string, unknown>[], brandColumns)
  );
}

const productColumns = [
  "id", "name", "description", "price", "imageUrl", "category",
];

const knowledgeColumns = [
  "id", "source", "videoTitle", "channelName", "thumbnailUrl",
  "videoUrl", "dateAnalyzed", "tactics", "fullTranscript", "summary",
];

const conceptColumns = [
  "id", "headline", "body", "description", "ctaText", "imagePrompt",
  "generatedImageUrl", "referenceImageUrl", "targetAudience",
  "format", "placements", "rationale", "productName", "inspirationAdIds",
  "starred", "createdAt", "qualityScore", "qualityFeedback", "qcPassed",
  "adType", "videoScript",
];

const metaAdColumns = [
  "id", "advertiser", "headline", "primaryText", "description",
  "ctaText", "imageUrl", "localImagePath", "videoUrl", "linkUrl",
  "platforms", "startDate", "isActive", "daysRunning", "scrapedAt",
];

const sourceColumns = [
  "id", "type", "title", "url", "thumbnailUrl", "channelName",
  "dateScraped", "description",
];

export function readProducts(): Product[] {
  return readCsv<Product>("products.csv");
}

export function writeProducts(products: Product[]) {
  return withWriteLock(() =>
    writeCsvSync("products.csv", products as unknown as Record<string, unknown>[], productColumns)
  );
}

export function readKnowledge(): KnowledgeEntry[] {
  return readCsv<KnowledgeEntry>("knowledge.csv");
}

export function writeKnowledge(entries: KnowledgeEntry[]) {
  return withWriteLock(() =>
    writeCsvSync("knowledge.csv", entries as unknown as Record<string, unknown>[], knowledgeColumns)
  );
}

export function appendKnowledge(entries: KnowledgeEntry[]) {
  return withWriteLock(() => {
    const existing = readKnowledge();
    writeCsvSync(
      "knowledge.csv",
      [...existing, ...entries] as unknown as Record<string, unknown>[],
      knowledgeColumns
    );
  });
}

export function readConcepts(): AdConcept[] {
  const rows = readCsv<Record<string, string>>("concepts.csv");
  return rows.map((r) => ({
    ...r,
    starred: String(r.starred) === "true" || r.starred === "1",
    qcPassed: r.qcPassed === undefined ? undefined : (String(r.qcPassed) === "true" || r.qcPassed === "1"),
    qualityScore: r.qualityScore ? Number(r.qualityScore) : undefined,
  })) as unknown as AdConcept[];
}

export function writeConcepts(concepts: AdConcept[]) {
  return withWriteLock(() =>
    writeCsvSync("concepts.csv", concepts as unknown as Record<string, unknown>[], conceptColumns)
  );
}

export function appendConcepts(concepts: AdConcept[]) {
  return withWriteLock(() => {
    const existing = readConcepts();
    writeCsvSync(
      "concepts.csv",
      [...existing, ...concepts] as unknown as Record<string, unknown>[],
      conceptColumns
    );
  });
}

export function readSources(): Source[] {
  return readCsv<Source>("sources.csv");
}

export function writeSources(sources: Source[]) {
  return withWriteLock(() =>
    writeCsvSync("sources.csv", sources as unknown as Record<string, unknown>[], sourceColumns)
  );
}

export function appendSources(sources: Source[]) {
  return withWriteLock(() => {
    const existing = readSources();
    writeCsvSync(
      "sources.csv",
      [...existing, ...sources] as unknown as Record<string, unknown>[],
      sourceColumns
    );
  });
}

export function readKnowledgeMarkdown(id: string): string {
  const dir = path.join(DATA_DIR, "knowledge");
  const fp = path.join(dir, `${id}.md`);
  if (!fs.existsSync(fp)) return "";
  return fs.readFileSync(fp, "utf-8");
}

export function writeKnowledgeMarkdown(id: string, content: string) {
  const dir = path.join(DATA_DIR, "knowledge");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.md`), content);
}

export function readMetaAds(): MetaAdEntry[] {
  const rows = readCsv<Record<string, unknown>>("meta-ads.csv");
  return rows.map((r) => ({
    ...r,
    isActive: r.isActive === true || r.isActive === "true" || r.isActive === "1",
    daysRunning: Number(r.daysRunning) || 0,
  })) as unknown as MetaAdEntry[];
}

export function writeMetaAds(ads: MetaAdEntry[]) {
  return withWriteLock(() =>
    writeCsvSync("meta-ads.csv", ads as unknown as Record<string, unknown>[], metaAdColumns)
  );
}

export function appendMetaAds(ads: MetaAdEntry[]) {
  return withWriteLock(() => {
    const existing = readMetaAds();
    writeCsvSync(
      "meta-ads.csv",
      [...existing, ...ads] as unknown as Record<string, unknown>[],
      metaAdColumns
    );
  });
}

export function readConfig(): Record<string, string> {
  const rows = readCsv<Record<string, string>>("config.csv");
  return rows.length > 0 ? rows[0] : {};
}

export function writeConfig(config: Record<string, string>) {
  return withWriteLock(() =>
    writeCsvSync("config.csv", [config], Object.keys(config))
  );
}
