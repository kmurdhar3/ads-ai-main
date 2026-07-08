"use client";

import { useEffect, useState, useRef } from "react";
import {
  Building2,
  Globe,
  AtSign,
  Loader2,
  Package,
  Palette,
  ImageIcon,
  Users,
  CheckCircle,
  AlertCircle,
  Terminal,
  Eye,
  Tag,
  ChevronDown,
  ChevronUp,
  X,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface BrandContext {
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
  youtubeContentAnalysis?: {
    brandThemes: string[];
    tone: string;
    messaging: string;
    targetAudience: string;
    contentStyle: string;
    keyTopics: string[];
  };
  youtubeSubscribers?: number;
  logoUrl?: string;
  faviconUrl?: string;
  sources: { type: string; url?: string; description: string }[];
  collectedAt: string;
  collectedBy: "claude-code" | "web-form";
}

interface Brand {
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

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  category: string;
}

interface ScrapeProgress {
  step: string;
  message: string;
  progress: number;
  errors: string[];
}

export default function BrandPage() {
  const [brandContext, setBrandContext] = useState<BrandContext | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScrapeForm, setShowScrapeForm] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [visualsExpanded, setVisualsExpanded] = useState(true);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [imageCacheBuster, setImageCacheBuster] = useState(Date.now());

  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/brand")
      .then((r) => r.json())
      .then((data) => {
        setBrand(data.brand);
        setBrandContext(data.brandContext || null);
        setProducts(data.products || []);
        setAssets(data.assets || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  async function handleScrape() {
    if (!websiteUrl) return;
    setScraping(true);
    setProgress(null);
    setLog([]);

    try {
      const res = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl,
          instagramHandle: instagramHandle.replace(/^@/, ""),
          youtubeUrl,
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data: ScrapeProgress = JSON.parse(line.slice(6));
              setProgress(data);
              setLog((prev) => [...prev, data.message]);
            } catch {
              // skip malformed SSE
            }
          }
        }
      }

      const brandRes = await fetch("/api/brand");
      const brandData = await brandRes.json();
      setBrand(brandData.brand);
      setBrandContext(brandData.brandContext || null);
      setProducts(brandData.products || []);
      setAssets(brandData.assets || []);
      setShowScrapeForm(false);
      setImageCacheBuster(Date.now()); // Force image reload
    } catch (e) {
      setLog((prev) => [...prev, `Error: ${e}`]);
    }

    setScraping(false);
  }

  const hasBrand = brandContext || brand;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // No brand — welcome screen
  if (!hasBrand) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 glow">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">Set Up Your Brand</h2>
          <p className="text-muted-foreground text-center max-w-lg">
            Start by collecting your brand context. You can either scrape a website below,
            or use Claude Code&apos;s <code className="text-xs bg-white/[0.06] px-1.5 py-0.5 rounded">/collect-brand</code> command
            for a more flexible approach (URLs, files, keywords, descriptions).
          </p>
        </div>

        {/* Scrape Form */}
        <Card className="glass-strong max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Quick Setup: Scrape Brand Sources
            </CardTitle>
            <CardDescription>
              Enter a website URL and optional social media links to automatically scrape your brand data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Website URL
                </Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={scraping}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5" />
                  Instagram Handle (optional)
                </Label>
                <Input
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@username"
                  disabled={scraping}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  YouTube URL (optional)
                </Label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  disabled={scraping}
                />
              </div>
            </div>

            <Button
              onClick={handleScrape}
              disabled={scraping || !websiteUrl}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white w-full md:w-auto"
              size="lg"
            >
              {scraping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              {scraping ? "Scraping..." : "Scrape Brand"}
            </Button>

            {renderProgress()}
          </CardContent>
        </Card>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4" />
            <span>Or run <code className="bg-white/[0.06] px-1.5 py-0.5 rounded text-xs">/collect-brand</code> in Claude Code for more flexible input</span>
          </div>
        </div>
      </div>
    );
  }

  // Brand exists — show profile
  const displayBrand = brandContext || brand!;
  const displayName = displayBrand.name;
  const displayUrl = ("url" in displayBrand ? displayBrand.url : "") || "";
  const displayDescription = displayBrand.description;
  const displayTagline = ("tagline" in displayBrand ? displayBrand.tagline : "") || "";
  const displayColors = ("colors" in displayBrand ? displayBrand.colors : "") || "";
  const displayStyle = ("style" in displayBrand ? displayBrand.style : "") || "";
  const displayIgHandle = ("instagramHandle" in displayBrand ? displayBrand.instagramHandle : "") || "";
  const displayIgFollowers = brandContext
    ? String(brandContext.instagramFollowers || "")
    : (brand?.instagramFollowers || "");
  const displayIgPic = ("instagramProfilePicUrl" in displayBrand ? displayBrand.instagramProfilePicUrl : "") || "";
  const displayLogo = ("logoUrl" in displayBrand ? displayBrand.logoUrl : "") || "";
  const displayFavicon = ("faviconUrl" in displayBrand ? displayBrand.faviconUrl : "") || "";
  const displayYoutubeChannel = brandContext?.youtubeChannelName || "";
  const displayYoutubeUrl = brandContext?.youtubeChannelUrl || "";
  const displayYoutubeSubscribers = brandContext?.youtubeSubscribers || 0;

  return (
    <div className="space-y-6">
      {/* Brand Identity */}
      <Card className="glass-strong">
        <CardContent className="pt-6">
          <div className="flex gap-6">
            {displayIgPic ? (
              <div className="flex-shrink-0 w-20 h-20 rounded-full overflow-hidden bg-white/[0.06]">
                <img
                  src={`/api/proxy-image?path=${encodeURIComponent("brand-assets/profile-pic.jpg")}&t=${imageCacheBuster}`}
                  alt={displayName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/api/proxy-image?url=${encodeURIComponent(displayIgPic)}`;
                  }}
                />
              </div>
            ) : displayFavicon ? (
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-white/[0.06] flex items-center justify-center">
                <img
                  src={`/api/proxy-image?path=${encodeURIComponent("brand-assets/favicon.ico")}&t=${imageCacheBuster}`}
                  alt={displayName}
                  className="w-12 h-12 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `/api/proxy-image?url=${encodeURIComponent(displayFavicon)}`;
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-lg font-bold">{displayName}</h3>
                  {displayTagline && (
                    <p className="text-sm text-primary">{displayTagline}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScrapeForm(!showScrapeForm)}
                  className="ml-auto"
                >
                  {showScrapeForm ? "Cancel" : "Change Brand"}
                </Button>
              </div>
              {displayDescription && (
                <div>
                  <p className={`text-sm text-muted-foreground leading-relaxed ${!descriptionExpanded ? "line-clamp-2" : ""}`}>
                    {displayDescription}
                  </p>
                  {displayDescription.length > 150 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDescriptionExpanded(!descriptionExpanded); }}
                      className="text-xs text-primary hover:underline mt-0.5"
                    >
                      {descriptionExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {displayUrl && (
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {displayFavicon ? (
                      <img
                        src={`/api/proxy-image?path=${encodeURIComponent("brand-assets/favicon.ico")}&t=${imageCacheBuster}`}
                        alt=""
                        className="h-4 w-4 rounded-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <Globe className={`h-3 w-3 ${displayFavicon ? "hidden" : ""}`} />
                    {displayUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                )}
                {displayIgHandle && (
                  <a
                    href={`https://instagram.com/${displayIgHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {displayIgPic ? (
                      <img
                        src={`/api/proxy-image?path=${encodeURIComponent("brand-assets/profile-pic.jpg")}&t=${imageCacheBuster}`}
                        alt=""
                        className="h-5 w-5 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <AtSign className="h-3 w-3" />
                    )}
                    @{displayIgHandle}
                  </a>
                )}
                {displayIgFollowers && displayIgFollowers !== "0" && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {Number(displayIgFollowers).toLocaleString()} followers
                  </span>
                )}
                {displayYoutubeChannel && (
                  <a
                    href={displayYoutubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Video className="h-3 w-3" />
                    {displayYoutubeChannel}
                  </a>
                )}
                {displayYoutubeSubscribers > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {displayYoutubeSubscribers.toLocaleString()} subscribers
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Brand Form (collapsible) */}
      {showScrapeForm && (
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Change Brand
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" />
                  Website URL
                </Label>
                <Input
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={scraping}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <AtSign className="h-3.5 w-3.5" />
                  Instagram Handle (optional)
                </Label>
                <Input
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="@username"
                  disabled={scraping}
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5" />
                  YouTube URL (optional)
                </Label>
                <Input
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/@channel"
                  disabled={scraping}
                />
              </div>
            </div>
            <Button
              onClick={handleScrape}
              disabled={scraping || !websiteUrl}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
            >
              {scraping ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4 mr-2" />
              )}
              {scraping ? "Scraping..." : "Scrape Brand"}
            </Button>
            {renderProgress()}
          </CardContent>
        </Card>
      )}

      {/* Brand Attributes — compact inline chips */}
      {(displayColors || displayStyle || brandContext?.category) && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-1">
          {displayColors && (
            <div className="flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Colors</span>
              <span className="text-xs text-foreground/80">{displayColors}</span>
            </div>
          )}
          {displayStyle && (
            <div className="flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Style</span>
              <span className="text-xs text-foreground/80">{displayStyle}</span>
            </div>
          )}
          {brandContext?.category && (
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Category</span>
              <span className="text-xs text-foreground/80">{brandContext.category}</span>
            </div>
          )}
        </div>
      )}

      {/* Brand Visuals Gallery — always visible, above the fold */}
      {assets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <ImageIcon className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold">
              Visuals ({assets.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((filename) => (
              <div
                key={filename}
                className="aspect-square rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.12] transition-colors cursor-pointer"
                onClick={() => setLightboxSrc(`/api/proxy-image?path=${encodeURIComponent(`brand-assets/${filename}`)}&t=${imageCacheBuster}`)}
              >
                <img
                  src={`/api/proxy-image?path=${encodeURIComponent(`brand-assets/${filename}`)}&t=${imageCacheBuster}`}
                  alt={filename}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid — collapsed by default */}
      {products.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setProductsExpanded(!productsExpanded)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <Package className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold flex-1">
              Products ({products.length})
            </h3>
            {productsExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>
          {productsExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {products.map((product) => (
                <Card
                  key={product.id}
                  className="glass cursor-pointer hover:border-white/[0.15] transition-colors"
                  onClick={() => {
                    if (product.imageUrl) {
                      setLightboxSrc(`/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}`);
                    }
                  }}
                >
                  <CardContent className="pt-5">
                    <div className="flex gap-3">
                      {product.imageUrl ? (
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-white/[0.04]">
                          <img
                            src={`/api/proxy-image?url=${encodeURIComponent(product.imageUrl)}`}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/[0.04] flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">
                          {product.name}
                        </h4>
                        {product.price && (
                          <p className="text-xs text-primary font-medium">
                            {product.price}
                          </p>
                        )}
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {product.description}
                          </p>
                        )}
                        {product.category && (
                          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">
                            {product.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Details — collapsed by default (Visual Analysis, YouTube Content Analysis, Keywords, Sources) */}
      {(brandContext?.visualAnalysis || brandContext?.youtubeContentAnalysis || (brandContext?.keywords && brandContext.keywords.length > 0) || (brandContext?.sources && brandContext.sources.length > 0)) && (
        <div className="space-y-3">
          <button
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            className="flex items-center gap-2 w-full text-left group"
          >
            <Eye className="h-4 w-4 text-primary" />
            <h3 className="text-base font-semibold flex-1">
              Details
            </h3>
            {detailsExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            )}
          </button>
          {detailsExpanded && (
            <div className="space-y-4">
              {brandContext?.visualAnalysis && (
                <Card className="glass">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Visual Analysis (Gemini)
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {brandContext.visualAnalysis}
                    </p>
                  </CardContent>
                </Card>
              )}

              {brandContext?.youtubeContentAnalysis && (
                <Card className="glass">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        YouTube Content Analysis
                      </span>
                    </div>
                    <div className="space-y-3 text-sm">
                      {brandContext.youtubeContentAnalysis.messaging && (
                        <div>
                          <span className="font-medium text-foreground">Core Message: </span>
                          <span className="text-muted-foreground">{brandContext.youtubeContentAnalysis.messaging}</span>
                        </div>
                      )}
                      {brandContext.youtubeContentAnalysis.tone && (
                        <div>
                          <span className="font-medium text-foreground">Tone: </span>
                          <span className="text-muted-foreground">{brandContext.youtubeContentAnalysis.tone}</span>
                        </div>
                      )}
                      {brandContext.youtubeContentAnalysis.targetAudience && (
                        <div>
                          <span className="font-medium text-foreground">Target Audience: </span>
                          <span className="text-muted-foreground">{brandContext.youtubeContentAnalysis.targetAudience}</span>
                        </div>
                      )}
                      {brandContext.youtubeContentAnalysis.brandThemes.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground block mb-2">Brand Themes:</span>
                          <div className="flex flex-wrap gap-2">
                            {brandContext.youtubeContentAnalysis.brandThemes.map((theme, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-white/[0.06]">
                                {theme}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {brandContext.youtubeContentAnalysis.keyTopics.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground block mb-2">Key Topics:</span>
                          <div className="flex flex-wrap gap-2">
                            {brandContext.youtubeContentAnalysis.keyTopics.map((topic, i) => (
                              <Badge key={i} variant="secondary" className="text-xs bg-purple-500/10 text-purple-300">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {brandContext?.keywords && brandContext.keywords.length > 0 && (
                <Card className="glass">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Search Keywords
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {brandContext.keywords.map((kw) => (
                        <Badge key={kw} variant="secondary" className="text-xs bg-white/[0.06]">
                          {kw}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {brandContext?.sources && brandContext.sources.length > 0 && (
                <Card className="glass">
                  <CardContent className="pt-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Sources
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {brandContext.sources.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[10px]">{s.type}</Badge>
                          <span>{s.description}</span>
                          {s.url && (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
                              {s.url.replace(/^https?:\/\//, "").slice(0, 40)}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.1] hover:bg-white/[0.2] transition-colors"
            onClick={() => setLightboxSrc(null)}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={lightboxSrc}
            alt="Full size"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );

  function renderProgress() {
    if (!progress && log.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        {progress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {progress.step === "done" ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : progress.step === "error" ? (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {progress.message}
              </span>
              <span className="text-muted-foreground">
                {Math.round(progress.progress)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.step === "done"
                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                    : progress.step === "error"
                      ? "bg-gradient-to-r from-red-500 to-red-700"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500"
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        <ScrollArea className="h-32 rounded-lg bg-black/30 p-3">
          <div ref={logRef} className="space-y-0.5 font-mono text-xs">
            {log.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes("Error") || line.includes("failed")
                    ? "text-red-400"
                    : line.includes("saved") || line.includes("done")
                      ? "text-green-400"
                      : "text-muted-foreground"
                }
              >
                {line}
              </div>
            ))}
          </div>
        </ScrollArea>

        {progress?.errors && progress.errors.length > 0 && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <h5 className="text-xs font-medium text-red-400 mb-1">
              Errors ({progress.errors.length})
            </h5>
            {progress.errors.map((err, i) => (
              <p key={i} className="text-xs text-red-300">
                {err}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }
}
