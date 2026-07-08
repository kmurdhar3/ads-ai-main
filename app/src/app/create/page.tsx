"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Sparkles, Star, Loader2, ArrowRight, ChevronRight, Clock, FileText, Film, Lightbulb, Target, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MarkdownContent } from "@/components/markdown-content";
import { MetaAdCard } from "@/components/meta-ad-card";

interface BrandContext {
  name: string;
  description: string;
}

interface Brand {
  name: string;
  url: string;
  description: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
}

interface AdConcept {
  id: string;
  headline: string;
  body: string;
  description: string;
  ctaText: string;
  imagePrompt: string;
  generatedImageUrl: string;
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

interface MetaAdEntry {
  id: string;
  advertiser: string;
  headline: string;
  primaryText: string;
  description: string;
  ctaText: string;
  imageUrl: string;
  localImagePath: string;
  videoUrl: string;
  platforms: string;
  daysRunning: number;
  isActive: boolean;
}

interface StatusData {
  hasBrand: boolean;
  competitorCount: number;
  conceptCount: number;
  knowledgeCount?: number;
  metaAdCount?: number;
  hasAnalysis?: boolean;
}

export default function CreatePage() {
  const [brandContext, setBrandContext] = useState<BrandContext | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [concepts, setConcepts] = useState<AdConcept[]>([]);
  const [metaAds, setMetaAds] = useState<MetaAdEntry[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: "" });
  const [showSetup, setShowSetup] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const [detailModal, setDetailModal] = useState<{ concept: AdConcept; section: "copy" | "script" | "strategy" } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    setElapsedDisplay(0);
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedDisplay(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Configurable controls
  const [conceptCount, setConceptCount] = useState(10);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/brand").then((r) => r.json()).catch(() => null),
      fetch("/api/create").then((r) => r.json()).catch(() => []),
      fetch("/api/status").then((r) => r.json()).catch(() => null),
      fetch("/api/competitors?type=meta-ads").then((r) => r.json()).catch(() => []),
    ]).then(([brandData, conceptsData, statusData, metaAdsData]) => {
      if (brandData) {
        setBrand(brandData.brand);
        setBrandContext(brandData.brandContext || null);
        setProducts(brandData.products || []);
        if (!brandData.brand && !brandData.brandContext) setShowSetup(true);
      } else {
        setShowSetup(true);
      }
      setConcepts(Array.isArray(conceptsData) ? conceptsData : []);
      if (statusData) setStatus(statusData);
      setMetaAds(Array.isArray(metaAdsData) ? metaAdsData : []);
    });
  }, []);

  const brandName = brandContext?.name || brand?.name || "Your Brand";

  async function handleBatchGenerate() {
    setGenerating(true);
    setConcepts([]);
    setProgress({ current: 0, total: conceptCount, message: "Starting batch generation..." });
    startTimer();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/create/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: conceptCount,
          productNames: selectedProducts.length > 0 ? selectedProducts : undefined,
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "concept" && data.concept) {
              setConcepts((prev) => {
                const exists = prev.some((c) => c.id === data.concept.id);
                if (exists) return prev;
                return [...prev, data.concept];
              });
            } else if (data.type === "progress") {
              setProgress({
                current: data.current,
                total: data.total,
                message: data.message,
              });
            } else if (data.type === "qc-retry") {
              setProgress((prev) => ({
                ...prev,
                message: data.message,
              }));
            } else if (data.type === "complete") {
              setProgress((prev) => ({
                ...prev,
                current: data.total,
                message: `Done! Generated ${data.total} concepts.`,
              }));
            }
          } catch { /* skip malformed events */ }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.error("Batch generation failed:", e);
      }
    }

    stopTimer();
    setGenerating(false);
    abortRef.current = null;

    fetch("/api/create")
      .then((r) => r.json())
      .then((data) => setConcepts(Array.isArray(data) ? data : []))
      .catch(() => {});
  }

  async function handleStar(id: string, starred: boolean) {
    await fetch("/api/create", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, starred }),
    });
    setConcepts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, starred } : c))
    );
  }

  function getReferenceAd(concept: AdConcept): MetaAdEntry | null {
    if (!concept.inspirationAdIds) return null;
    const firstId = concept.inspirationAdIds.split(",")[0].trim();
    return metaAds.find((a) => a.id === firstId) || null;
  }

  function toggleProduct(name: string) {
    setSelectedProducts((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  }

  if (showSetup) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 glow">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold gradient-text">Welcome to Ads AI</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Set up your brand first. Go to{" "}
          <a href="/brand" className="text-primary underline">Brand Context</a>{" "}
          to get started.
        </p>
        <Button
          onClick={() => (window.location.href = "/brand")}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Set Up Brand
        </Button>
      </div>
    );
  }

  const filteredConcepts = concepts;

  return (
    <div className="space-y-8">
      {/* Compact generation bar */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={30}
              value={conceptCount}
              onChange={(e) => setConceptCount(Math.min(30, Math.max(1, Number(e.target.value))))}
              disabled={generating}
              className="w-20 h-9 text-sm"
            />
            <span className="text-xs text-muted-foreground">concepts</span>
          </div>
          <Button
            onClick={handleBatchGenerate}
            disabled={generating || metaAds.length === 0}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white h-9"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {generating
              ? `${progress.current}/${progress.total}`
              : concepts.length > 0
                ? "Regenerate"
                : "Generate"}
          </Button>
          {metaAds.length === 0 && (
            <span className="text-xs text-amber-400/80">
              <a href="/competitors" className="underline hover:text-amber-300">Find competitors</a> first
            </span>
          )}
          {products.length > 0 && (
            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.name)}
                  disabled={generating}
                  className={`text-[11px] px-2 py-1 rounded-lg border transition-colors ${
                    selectedProducts.includes(p.name)
                      ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                      : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:border-white/[0.12]"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {generating && (() => {
          const done = concepts.length;
          const total = progress.total || conceptCount;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          const estPerBatch = 120;
          const batchesTotal = Math.ceil(total / 3);
          const estTotal = batchesTotal * estPerBatch;
          const formatTime = (s: number) => {
            const m = Math.floor(s / 60);
            const sec = s % 60;
            return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
          };

          return (
            <div className="space-y-2">
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.max(pct, done > 0 ? pct : 3)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{progress.message}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="font-mono">{formatTime(elapsedDisplay)}</span>
                  </span>
                  <span className="font-mono">{pct}%</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Generated Concepts — Side by Side */}
      {concepts.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">
            {filteredConcepts.length} Ad Concept{filteredConcepts.length !== 1 ? "s" : ""}
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredConcepts.map((concept, idx) => {
              const refAd = getReferenceAd(concept);

              return (
                <div key={concept.id} className="glass rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground">#{idx + 1}</span>
                      {concept.productName && (
                        <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                          {concept.productName}
                        </Badge>
                      )}
                      {concept.adType && (
                        <Badge variant="secondary" className={`text-[10px] ${
                          concept.adType === "video"
                            ? "bg-blue-500/15 text-blue-400 border-blue-500/20"
                            : "bg-white/[0.06] text-muted-foreground"
                        }`}>
                          {concept.adType === "video" ? "Video" : "Static"}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleStar(concept.id, !concept.starred)}
                    >
                      <Star
                        className={`h-4 w-4 ${concept.starred ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                      />
                    </Button>
                  </div>

                  {/* Visual comparison — horizontal side by side with arrow */}
                  <div className="flex flex-row items-stretch p-3 gap-0">
                    {/* LEFT: Reference Competitor Ad */}
                    {refAd && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1.5 px-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Ref
                          </span>
                          {refAd.daysRunning > 0 && (
                            <span className={`text-[10px] font-medium flex items-center gap-1 ${
                              refAd.daysRunning >= 30 ? "text-amber-400" : "text-muted-foreground"
                            }`}>
                              · {refAd.daysRunning}d
                            </span>
                          )}
                          <a
                            href={`https://www.facebook.com/ads/library/?id=${refAd.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 ml-auto"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                        <MetaAdCard
                          adId={refAd.id}
                          localImagePath={refAd.localImagePath || undefined}
                          imageUrl={!refAd.localImagePath ? refAd.imageUrl : undefined}
                          videoUrl={refAd.videoUrl || undefined}
                          primaryText={refAd.primaryText}
                          headline={refAd.headline}
                          description={refAd.description}
                          ctaText={refAd.ctaText}
                          platforms={refAd.platforms}
                          daysRunning={refAd.daysRunning}
                          isActive={refAd.isActive}
                          showCopy={false}
                          variant="full"
                        />
                      </div>
                    )}

                    {/* CENTER: Arrow */}
                    {refAd && (
                      <div className="flex items-center justify-center px-2 flex-shrink-0">
                        <svg width="44" height="24" viewBox="0 0 44 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id={`arrow-grad-${idx}`} x1="0" y1="12" x2="44" y2="12" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="rgb(168 85 247)" stopOpacity="0.1" />
                              <stop offset="40%" stopColor="rgb(168 85 247)" stopOpacity="0.6" />
                              <stop offset="100%" stopColor="rgb(139 92 246)" stopOpacity="1" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="12" x2="30" y2="12" stroke={`url(#arrow-grad-${idx})`} strokeWidth="2.5" strokeLinecap="round" />
                          <path d="M27 5 L38 12 L27 19" stroke="rgb(139 92 246)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                        </svg>
                      </div>
                    )}

                    {/* RIGHT: Brand Version */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5 px-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">
                          Yours
                        </p>
                        {concept.adType === "video" && (
                          <span className="text-[9px] font-medium uppercase tracking-wider text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                            Video
                          </span>
                        )}
                      </div>
                      <MetaAdCard
                        imageSrc={concept.generatedImageUrl || undefined}
                        primaryText={concept.body}
                        headline={concept.headline}
                        description={concept.description}
                        ctaText={concept.ctaText}
                        platforms={concept.placements}
                        showCopy={false}
                        variant="full"
                      />
                    </div>
                  </div>

                  {/* Glass action buttons */}
                  <div className="px-4 pb-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => setDetailModal({ concept, section: "copy" })}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
                    >
                      <FileText className="h-3.5 w-3.5 text-purple-400" />
                      <span>Copy</span>
                    </button>
                    {concept.videoScript && (
                      <button
                        onClick={() => setDetailModal({ concept, section: "script" })}
                        className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
                      >
                        <Film className="h-3.5 w-3.5 text-blue-400" />
                        <span>Script</span>
                      </button>
                    )}
                    <button
                      onClick={() => setDetailModal({ concept, section: "strategy" })}
                      className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium glass border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                      <span>Strategy</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detail Modal */}
          <Dialog open={!!detailModal} onOpenChange={(open) => { if (!open) setDetailModal(null); }}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden glass-strong rounded-2xl border-white/[0.08] p-0 gap-0">
              <DialogTitle className="sr-only">
                {detailModal?.section === "copy" ? "Ad Copy" : detailModal?.section === "script" ? "Video Script" : "Strategy"}
              </DialogTitle>
              {detailModal && (() => {
                const { concept, section } = detailModal;
                return (
                  <>
                    {/* Modal header with section tabs */}
                    <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.06]">
                      <button
                        onClick={() => setDetailModal({ concept, section: "copy" })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                          section === "copy"
                            ? "bg-purple-500/15 text-purple-300 border border-purple-500/20"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Ad Copy
                      </button>
                      {concept.videoScript && (
                        <button
                          onClick={() => setDetailModal({ concept, section: "script" })}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                            section === "script"
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/20"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Film className="h-3.5 w-3.5" />
                          Video Script
                        </button>
                      )}
                      <button
                        onClick={() => setDetailModal({ concept, section: "strategy" })}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                          section === "strategy"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Lightbulb className="h-3.5 w-3.5" />
                        Strategy
                      </button>
                    </div>

                    {/* Modal content */}
                    <div className="overflow-y-auto max-h-[calc(85vh-60px)] p-5">
                      {section === "copy" && (
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Primary Text</p>
                            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{concept.body}</p>
                          </div>
                          <div className="h-px bg-white/[0.06]" />
                          <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Headline</p>
                              <p className="text-sm font-semibold">{concept.headline}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Description</p>
                              <p className="text-sm text-foreground/80">{concept.description || "—"}</p>
                            </div>
                          </div>
                          <div className="h-px bg-white/[0.06]" />
                          <div className="flex items-center gap-3">
                            <div className="space-y-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Call to Action</p>
                              <span className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] text-foreground/90">
                                {concept.ctaText}
                              </span>
                            </div>
                          </div>
                          {concept.placements && (
                            <>
                              <div className="h-px bg-white/[0.06]" />
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Placements</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {concept.placements.split(",").map((p) => p.trim()).filter(Boolean).map((p) => (
                                    <Badge key={p} variant="secondary" className="text-[10px] bg-white/[0.04] border-white/[0.08]">{p}</Badge>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {section === "script" && concept.videoScript && (
                        <div className="space-y-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Scene-by-Scene Script</p>
                          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 whitespace-pre-line text-sm text-foreground/85 leading-relaxed">
                            {concept.videoScript}
                          </div>
                        </div>
                      )}

                      {section === "strategy" && (
                        <div className="space-y-5">
                          {concept.targetAudience && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5">
                                <Target className="h-3.5 w-3.5 text-amber-400" />
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Target Audience</p>
                              </div>
                              <p className="text-sm text-foreground/85 leading-relaxed">{concept.targetAudience}</p>
                            </div>
                          )}
                          {concept.rationale && (
                            <>
                              {concept.targetAudience && <div className="h-px bg-white/[0.06]" />}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5">
                                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">Why This Concept</p>
                                </div>
                                <div className="text-sm text-foreground/85 leading-relaxed">
                                  <MarkdownContent content={concept.rationale} />
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
