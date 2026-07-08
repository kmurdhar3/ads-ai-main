// === Brand Context (JSON-based, replaces Brand CSV) ===

export interface BrandContext {
  name: string;
  url?: string;
  description: string;
  tagline?: string;
  category: string;
  keywords: string[];
  colors?: string;
  style?: string;
  visualAnalysis?: string;
  instagramHandle?: string;
  instagramFollowers?: number;
  instagramProfilePicUrl?: string;
  youtubeChannelName?: string;
  youtubeChannelUrl?: string;
  youtubeSubscribers?: number;
  youtubeContentAnalysis?: {
    brandThemes: string[];
    tone: string;
    messaging: string;
    targetAudience: string;
    contentStyle: string;
    keyTopics: string[];
  };
  logoUrl?: string;
  faviconUrl?: string;
  sources: { type: string; url?: string; description: string }[];
  collectedAt: string;
  collectedBy: "claude-code" | "web-form";
}

// Legacy Brand interface — kept for migration from CSV
export interface Brand {
  name: string;
  url: string;
  description: string;
  tagline: string;
  products: string;
  colors: string;
  logoUrl: string;
  faviconUrl: string;
  style: string;
  instagramHandle: string;
  instagramFollowers: string;
  instagramProfilePicUrl: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  category: string;
}

// === Competitor Search & Scoring ===

export interface ScoredAdvertiser {
  name: string;
  totalAds: number;
  activeAds: number;
  maxDaysRunning: number;
  avgDaysRunning: number;
  creativeDiversity: number;
  score: number;
  adIds: string[];
}

export interface SearchState {
  keywords: string[];
  searchedAt: string;
  advertisers: ScoredAdvertiser[];
  totalAdsScraped: number;
}

// === "What's Working" Analysis ===

export interface HookAnalysis {
  adId: string;
  advertiser: string;
  hookText: string;
  hookTechnique: string;
  hookVisual: string;
  whyItWorks: string;
  effectiveness: number;
  isVideo: boolean;
  videoFirstSeconds?: string;
}

export interface WinningPattern {
  name: string;
  frequency: number;
  avgDaysRunning: number;
  description: string;
  examples: { advertiser: string; adId: string; excerpt: string }[];
  hookType: string;
  copyStructure: string;
  emotionalAngle: string;
  offerType: string;
  visualApproach: string;
  hookAnalysis?: string;
}

export interface AnalysisResult {
  patterns: WinningPattern[];
  hooks: HookAnalysis[];
  summary: string;
  analyzedAt: string;
  totalAdsAnalyzed: number;
}

// === Quality Control ===

export interface QualityScore {
  conceptId: string;
  brandConsistency: number;
  copyQuality: number;
  visualRelevance: number;
  overallScore: number;
  passed: boolean;
  feedback: string;
  evaluatedAt: string;
}

export interface KnowledgeEntry {
  id: string;
  source: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  videoUrl: string;
  dateAnalyzed: string;
  tactics: string;
  fullTranscript: string;
  summary: string;
}

export interface AdConcept {
  id: string;
  headline: string;
  body: string;
  description: string;
  ctaText: string;
  imagePrompt: string;
  generatedImageUrl: string;
  referenceImageUrl: string;
  targetAudience: string;
  format: string;
  placements: string;
  rationale: string;
  productName: string;
  inspirationAdIds: string;
  starred: boolean;
  createdAt: string;
  qualityScore?: number;
  qualityFeedback?: string;
  qcPassed?: boolean;
  adType?: "static" | "video";
  videoScript?: string;
}

export interface MetaAdEntry {
  id: string;
  advertiser: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaText: string;
  imageUrl: string;
  localImagePath: string;
  videoUrl: string;
  linkUrl: string;
  platforms: string;
  startDate: string;
  isActive: boolean;
  daysRunning: number;
  scrapedAt: string;
}

export interface Source {
  id: string;
  type: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  dateScraped: string;
  description: string;
}
