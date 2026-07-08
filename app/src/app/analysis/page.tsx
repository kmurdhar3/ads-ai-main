"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Loader2, Sparkles, ArrowRight, BarChart3, Zap, MessageSquare, Eye, Target, Gift, Play, X, ExternalLink, Clock, Film, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarkdownContent } from "@/components/markdown-content";

interface HookAnalysis {
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

interface WinningPattern {
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

interface AnalysisResult {
  patterns: WinningPattern[];
  hooks: HookAnalysis[];
  summary: string;
  analyzedAt: string;
  totalAdsAnalyzed: number;
}

interface MetaAdEntry {
  id: string;
  advertiser: string;
  headline: string;
  primaryText: string;
  imageUrl: string;
  localImagePath: string;
  videoUrl: string;
  daysRunning: number;
}

interface StatusData {
  metaAdCount: number;
}

type PageState = "loading" | "no-data" | "ready" | "analyzing" | "results";

export default function AnalysisPage() {
  const [state, setState] = useState<PageState>("loading");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [metaAds, setMetaAds] = useState<MetaAdEntry[]>([]);
  const [adCount, setAdCount] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const [expandedHookDetails, setExpandedHookDetails] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([
      fetch("/api/analysis").then((r) => r.json()).catch(() => null),
      fetch("/api/status").then((r) => r.json()).catch(() => null),
      fetch("/api/competitors?type=meta-ads").then((r) => r.json()).catch(() => []),
    ]).then(([analysisData, statusData, metaAdsData]) => {
      const metaAdCount = (statusData as StatusData)?.metaAdCount || 0;
      setAdCount(metaAdCount);
      setMetaAds(Array.isArray(metaAdsData) ? metaAdsData : []);

      if (analysisData && analysisData.patterns && analysisData.patterns.length > 0) {
        setAnalysis(analysisData as AnalysisResult);
        setState("results");
      } else if (metaAdCount === 0) {
        setState("no-data");
      } else {
        setState("ready");
      }
    }).catch(() => setState("no-data"));
  }, []);

  const adMap = new Map(metaAds.map((a) => [a.id, a]));

  function getAdThumbnail(adId: string): string | null {
    const ad = adMap.get(adId);
    if (!ad) return null;
    if (ad.localImagePath) return `/api/proxy-image?path=${encodeURIComponent(ad.localImagePath)}`;
    if (ad.imageUrl) return `/api/proxy-image?url=${encodeURIComponent(ad.imageUrl)}`;
    return null;
  }

  function isVideoAd(adId: string): boolean {
    const ad = adMap.get(adId);
    return !!ad?.videoUrl;
  }

  function getAdVideoUrl(adId: string): string | null {
    const ad = adMap.get(adId);
    return ad?.videoUrl || null;
  }

  function getAdDaysRunning(adId: string): number {
    const ad = adMap.get(adId);
    return ad?.daysRunning || 0;
  }

  function openLightbox(adId: string) {
    const thumbnail = getAdThumbnail(adId);
    const videoUrl = getAdVideoUrl(adId);
    if (videoUrl) {
      setLightboxVideo(videoUrl);
      setLightboxSrc(null);
    } else if (thumbnail) {
      setLightboxSrc(thumbnail);
      setLightboxVideo(null);
    }
  }

  function closeLightbox() {
    setLightboxSrc(null);
    setLightboxVideo(null);
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setState("analyzing");

    try {
      const res = await fetch("/api/analysis", { method: "POST" });
      const data = await res.json();

      if (data.patterns) {
        setAnalysis(data);
        setState("results");
      } else {
        setState("ready");
      }
    } catch {
      setState("ready");
    }

    setAnalyzing(false);
  }

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "no-data") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 glow">
          <TrendingUp className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold gradient-text">Find Competitors First</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Before analyzing what&apos;s working, search for competitor ads.
          Go to <a href="/competitors" className="text-primary underline">Find Competitors</a> to get started.
        </p>
        <Button
          onClick={() => (window.location.href = "/competitors")}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
        >
          Find Competitors
        </Button>
      </div>
    );
  }

  if (state === "ready" || state === "analyzing") {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">What&apos;s Working</h2>
          <p className="text-muted-foreground">
            Analyze competitor ads to identify winning hooks and patterns
          </p>
        </div>

        <Card className="glass-strong">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm">
                <span className="font-semibold">{adCount}</span> ads ready to analyze
              </span>
            </div>

            <Button
              onClick={runAnalysis}
              disabled={analyzing}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
              size="lg"
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              {analyzing ? "Analyzing..." : "Analyze What's Working"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results state
  const patterns = analysis?.patterns || [];
  const hooks = (analysis?.hooks || [])
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 15);

  const iconMap: Record<string, typeof Zap> = {
    question: MessageSquare,
    social: Target,
    discount: Gift,
    bold: Zap,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">What&apos;s Working</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {analysis?.totalAdsAnalyzed || 0} competitor ads analyzed
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analyzing}>
            {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
            Re-analyze
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
            onClick={() => (window.location.href = "/create")}
          >
            Next: Create Ads
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* === TOP HOOKS — The most important section === */}
      {hooks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold">Top Hooks</h3>
            <span className="text-xs text-muted-foreground">— the most important part of every ad</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {hooks.map((hook, idx) => {
              const thumbnail = getAdThumbnail(hook.adId);
              const daysRunning = getAdDaysRunning(hook.adId);
              const adLibraryUrl = `https://www.facebook.com/ads/library/?id=${hook.adId}`;
              const showDetails = expandedHookDetails.has(idx);
              const hasDetails = hook.hookVisual || (hook.isVideo && hook.videoFirstSeconds);

              return (
                <div key={hook.adId + idx} className="glass rounded-2xl overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Thumbnail — natural aspect ratio */}
                    <div className="md:w-[180px] flex-shrink-0 p-3">
                      {thumbnail ? (
                        <div
                          className="relative rounded-xl overflow-hidden cursor-pointer hover:ring-1 hover:ring-white/20 transition-all aspect-[3/4]"
                          onClick={() => openLightbox(hook.adId)}
                        >
                          <img
                            src={thumbnail}
                            alt={`${hook.advertiser} ad`}
                            className="w-full h-full object-cover"
                          />
                          {hook.isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-colors">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50">
                                <Play className="h-3.5 w-3.5 text-white ml-0.5" />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-xl bg-white/[0.04] flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    {/* Hook content */}
                    <div className="flex-1 p-4 md:pl-0 space-y-2.5">
                      <p className="text-sm font-semibold leading-snug text-foreground">
                        &ldquo;{hook.hookText}&rdquo;
                      </p>

                      {/* Metadata row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                          {hook.hookTechnique}
                        </Badge>
                        <Badge variant="secondary" className={`text-[10px] ${hook.isVideo ? "bg-blue-500/15 text-blue-400 border-blue-500/20" : "bg-white/[0.06] text-muted-foreground"}`}>
                          {hook.isVideo ? "Video" : "Static"}
                        </Badge>
                        {daysRunning > 0 && (
                          <span className={`text-[10px] flex items-center gap-1 ${daysRunning >= 30 ? "text-amber-400" : "text-muted-foreground"}`}>
                            <Clock className="h-2.5 w-2.5" />
                            {daysRunning}d
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{hook.advertiser}</span>
                        <a
                          href={adLibraryUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 ml-auto"
                        >
                          Ad Library <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>

                      {/* Why it works — truncated */}
                      <p className={`text-xs text-muted-foreground leading-relaxed ${!showDetails ? "line-clamp-2" : ""}`}>
                        {hook.whyItWorks}
                      </p>

                      {/* Folded details: Visual + First 3-5 seconds */}
                      {hasDetails && (
                        <>
                          {showDetails && (
                            <div className="space-y-2.5">
                              {hook.hookVisual && (
                                <div className="text-xs text-foreground/70 leading-relaxed">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visual: </span>
                                  {hook.hookVisual}
                                </div>
                              )}
                              {hook.isVideo && hook.videoFirstSeconds && (
                                <div className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Film className="h-3 w-3 text-blue-400" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">First 3-5 seconds</span>
                                  </div>
                                  <p className="text-xs text-foreground/80 leading-relaxed">{hook.videoFirstSeconds}</p>
                                </div>
                              )}
                            </div>
                          )}
                          <button
                            onClick={() => setExpandedHookDetails((prev) => {
                              const next = new Set(prev);
                              if (next.has(idx)) next.delete(idx); else next.add(idx);
                              return next;
                            })}
                            className="text-[10px] text-primary hover:underline"
                          >
                            {showDetails ? "Less" : "More details"}
                          </button>
                        </>
                      )}
                    </div>

                    {/* Effectiveness score */}
                    <div className="flex-shrink-0 flex items-start p-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${
                        hook.effectiveness >= 8 ? "bg-green-500/15 text-green-400 border border-green-500/20"
                        : hook.effectiveness >= 6 ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        : "bg-white/[0.06] text-muted-foreground"
                      }`}>
                        {hook.effectiveness}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === Summary === */}
      {analysis?.summary && (
        <Card className="glass-strong">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Summary
              </span>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <MarkdownContent content={analysis.summary} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* === Winning Patterns === */}
      {patterns.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{patterns.length} Winning Patterns</h3>

          <div className="grid gap-4">
            {patterns.map((pattern, idx) => {
              const hookKey = pattern.hookType?.split(" ")[0]?.toLowerCase() || "";
              const PatternIcon = iconMap[hookKey] || TrendingUp;

              return (
                <Card key={idx} className="glass">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] flex-shrink-0">
                        <PatternIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-sm font-semibold">{pattern.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {pattern.frequency} ads
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/20">
                            Avg {pattern.avgDaysRunning}d running
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {pattern.description}
                    </p>

                    {/* Hook analysis paragraph */}
                    {pattern.hookAnalysis && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Zap className="h-3 w-3 text-amber-400" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Hook Analysis</span>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">{pattern.hookAnalysis}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> Hook
                        </p>
                        <p className="text-xs">{pattern.hookType}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Copy</p>
                        <p className="text-xs">{pattern.copyStructure}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Target className="h-3 w-3" /> Emotion
                        </p>
                        <p className="text-xs">{pattern.emotionalAngle}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Gift className="h-3 w-3" /> Offer
                        </p>
                        <p className="text-xs">{pattern.offerType}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Visual
                        </p>
                        <p className="text-xs">{pattern.visualApproach}</p>
                      </div>
                    </div>

                    {/* Examples with thumbnails */}
                    {pattern.examples && pattern.examples.length > 0 && (
                      <div className="border-t border-white/[0.06] pt-3">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Examples</p>
                        <div className="space-y-2">
                          {pattern.examples.slice(0, 3).map((ex, i) => {
                            const thumbnail = getAdThumbnail(ex.adId);
                            const isVideo = isVideoAd(ex.adId);
                            const adLibraryUrl = ex.adId ? `https://www.facebook.com/ads/library/?id=${ex.adId}` : null;

                            return (
                              <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                {thumbnail ? (
                                  <div
                                    className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white/[0.04] cursor-pointer hover:ring-1 hover:ring-white/[0.2] transition-all"
                                    onClick={() => openLightbox(ex.adId)}
                                  >
                                    <img
                                      src={thumbnail}
                                      alt={`${ex.advertiser} ad`}
                                      className="w-full h-full object-cover"
                                    />
                                    {isVideo && (
                                      <div className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-colors">
                                        <Play className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                    <Eye className="h-4 w-4 text-muted-foreground/40" />
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-[9px]">{ex.advertiser}</Badge>
                                    {isVideo && (
                                      <Badge variant="secondary" className="text-[9px] bg-blue-500/15 text-blue-400 border-blue-500/20">Video</Badge>
                                    )}
                                    {adLibraryUrl && (
                                      <a
                                        href={adLibraryUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground hover:text-primary transition-colors ml-auto"
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" />
                                        Source
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{ex.excerpt}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Lightbox — image or video */}
      {(lightboxSrc || lightboxVideo) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/[0.1] hover:bg-white/[0.2] transition-colors"
            onClick={closeLightbox}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          {lightboxVideo ? (
            <video
              src={lightboxVideo}
              autoPlay
              controls
              playsInline
              className="max-w-[90vw] max-h-[90vh] rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={lightboxSrc!}
              alt="Full size"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
}
