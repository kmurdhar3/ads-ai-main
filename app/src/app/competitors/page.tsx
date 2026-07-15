"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Search, X, Plus, Loader2, CheckCircle, AlertCircle, ArrowRight, RefreshCw, ChevronDown, ChevronUp, Hash, Clock, Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MetaAdCard } from "@/components/meta-ad-card";

interface ScoredAdvertiser {
  name: string;
  totalAds: number;
  activeAds: number;
  maxDaysRunning: number;
  avgDaysRunning: number;
  creativeDiversity: number;
  score: number;
  adIds: string[];
}

interface SearchState {
  keywords: string[];
  searchedAt: string;
  advertisers: ScoredAdvertiser[];
  totalAdsScraped: number;
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
  linkUrl: string;
  platforms: string;
  startDate: string;
  isActive: boolean;
  daysRunning: number;
}

interface SearchProgress {
  phase: string;
  keyword?: string;
  index?: number;
  total?: number;
  adsFound?: number;
  adCount?: number;
  elapsedSeconds?: number;
  message: string;
}

type PageState = "loading" | "no-brand" | "setup" | "searching" | "results";

export default function CompetitorsPage() {
  const [state, setState] = useState<PageState>("loading");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [adsPerKeyword, setAdsPerKeyword] = useState(15);
  const [searchState, setSearchState] = useState<SearchState | null>(null);
  const [metaAds, setMetaAds] = useState<MetaAdEntry[]>([]);
  const [expandedAdvertiser, setExpandedAdvertiser] = useState<string | null>(null);
  const [progress, setProgress] = useState<SearchProgress[]>([]);
  const [suggestingKeywords, setSuggestingKeywords] = useState(false);
  const [elapsedDisplay, setElapsedDisplay] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    const start = Date.now();
    setElapsedDisplay(0);
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

  useEffect(() => {
    Promise.all([
      fetch("/api/search").then((r) => r.json()),
      fetch("/api/competitors?type=meta-ads").then((r) => r.json()),
      fetch("/api/brand").then((r) => r.json()),
    ]).then(([searchData, metaAdsData, brandData]) => {
      const ads = Array.isArray(metaAdsData) ? metaAdsData : [];
      setMetaAds(ads);

      if (searchData && searchData.advertisers && searchData.advertisers.length > 0) {
        setSearchState(searchData);
        setKeywords(searchData.keywords || []);
        setState("results");
      } else if (!brandData.brand && !brandData.brandContext) {
        setState("no-brand");
      } else {
        setState("setup");
        fetchSuggestedKeywords();
      }
    }).catch(() => setState("no-brand"));
  }, []);

  async function fetchSuggestedKeywords() {
    setSuggestingKeywords(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest-keywords" }),
      });
      const data = await res.json();
      if (data.keywords && data.keywords.length > 0) {
        setKeywords(data.keywords);
      }
    } catch {
      // suggestion failed
    }
    setSuggestingKeywords(false);
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
  }

  function addKeyword() {
    const trimmed = newKeyword.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    setKeywords((prev) => [...prev, trimmed]);
    setNewKeyword("");
  }

  async function startSearch() {
    setState("searching");
    setProgress([]);
    setMetaAds([]);
    setSearchState(null);
    startTimer();

    const controller = new AbortController();
    abortRef.current = controller;

    // Client-side timeout: 310 seconds (slightly longer than server's 300s maxDuration)
    const clientTimeout = setTimeout(() => {
      controller.abort();
      stopTimer();
      setProgress((prev) => [...prev, {
        phase: "error",
        message: "Search timed out after 5 minutes. Please try with fewer keywords or lower ads-per-keyword.",
      }]);
      setState("setup");
    }, 310_000);

    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", keywords, adsPerKeyword }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Search failed: ${res.status} ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let lastEventTime = Date.now();

      // Connection health check: if no events for 60s, connection likely dropped
      const healthCheck = setInterval(() => {
        const elapsed = Date.now() - lastEventTime;
        if (elapsed > 60_000) {
          clearInterval(healthCheck);
          controller.abort();
          stopTimer();
          setProgress((prev) => [...prev, {
            phase: "error",
            message: "Connection lost. The search may have timed out or encountered an error. Please try again.",
          }]);
          setState("setup");
        }
      }, 5_000);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          clearInterval(healthCheck);
          clearTimeout(clientTimeout);
          // Stream ended without "done" event — likely an error
          if (state === "searching") {
            stopTimer();
            setProgress((prev) => [...prev, {
              phase: "error",
              message: "Search ended unexpectedly. Please try again with fewer keywords.",
            }]);
            setState("setup");
          }
          break;
        }

        lastEventTime = Date.now();
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SearchProgress = JSON.parse(line.slice(6));
            // Update-in-place events: heartbeat and searching-progress
            if (event.phase === "heartbeat" || event.phase === "searching-progress") {
              setProgress((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex(
                  (p) => p.keyword === event.keyword && (p.phase === "searching" || p.phase === "heartbeat" || p.phase === "searching-progress")
                );
                if (idx >= 0) {
                  updated[idx] = { ...updated[idx], ...event };
                } else {
                  updated.push(event);
                }
                return updated;
              });
            } else {
              // Append events: searching, downloading, keyword-done, keyword-error, error, done
              setProgress((prev) => [...prev, event]);
            }

            if (event.phase === "done") {
              clearInterval(healthCheck);
              clearTimeout(clientTimeout);
              stopTimer();
              const [searchRes, adsRes] = await Promise.all([
                fetch("/api/search"),
                fetch("/api/competitors?type=meta-ads"),
              ]);
              const sData = await searchRes.json();
              const aData = await adsRes.json();
              setSearchState(sData);
              setMetaAds(Array.isArray(aData) ? aData : []);
              setState("results");
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      clearTimeout(clientTimeout);
      stopTimer();
      if ((e as Error).name !== "AbortError") {
        setProgress((prev) => [...prev, {
          phase: "error",
          message: `Search failed: ${(e as Error).message}`,
        }]);
        setState("setup");
      }
    }
  }

  function goToResearch() {
    setProgress([]);
    setState("setup");
    if (keywords.length === 0) {
      fetchSuggestedKeywords();
    }
  }

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state === "no-brand") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 glow">
          <Search className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold gradient-text">Set Up Your Brand First</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Before finding competitors, we need to understand your brand.
          Go to <a href="/brand" className="text-primary underline">Brand Context</a> to get started.
        </p>
        <Button
          onClick={() => (window.location.href = "/brand")}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
        >
          Set Up Brand
        </Button>
      </div>
    );
  }

  if (state === "setup") {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Find Competitors</h2>
          <p className="text-muted-foreground">
            Search the Meta Ad Library by keyword to find advertisers in your space
          </p>
        </div>

        <Card className="glass-strong">
          <CardHeader>
            <CardTitle className="text-base">Search Keywords</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestingKeywords ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Suggesting keywords from your brand context...
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="pl-3 pr-1.5 py-1.5 text-sm bg-white/[0.06] border border-white/[0.1] hover:border-white/[0.2] transition-colors"
                    >
                      {kw}
                      <button
                        onClick={() => removeKeyword(kw)}
                        className="ml-2 rounded-full p-0.5 hover:bg-white/[0.1] transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                    placeholder="Add a keyword..."
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon" onClick={addKeyword} disabled={!newKeyword.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Hash className="h-3 w-3" />
                    Ads per keyword
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={adsPerKeyword}
                    onChange={(e) => setAdsPerKeyword(Math.max(1, Number(e.target.value)))}
                    className="w-24"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Start with 3-5 for quick testing, use 15+ for thorough search
                  </p>
                </div>
              </>
            )}

            <Button
              onClick={startSearch}
              disabled={keywords.length === 0 || suggestingKeywords}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
              size="lg"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Meta Ad Library
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (state === "searching") {
    const completed = progress.filter((p) => p.phase === "keyword-done" || p.phase === "keyword-error");
    const total = keywords.length;
    const activeKeyword = keywords.find((kw) => {
      const isSearching = progress.some((p) => p.keyword === kw && p.phase === "searching");
      const isDone = progress.some((p) => p.keyword === kw && (p.phase === "keyword-done" || p.phase === "keyword-error"));
      return isSearching && !isDone;
    });
    const downloadCount = progress.find((p) => p.phase === "downloading" && p.keyword === activeKeyword)?.adCount;
    const errorMessage = progress.find((p) => p.phase === "error")?.message;

    const estimatePerBatch = 20;
    const totalBatches = Math.ceil(total / 3);
    const totalEstimate = totalBatches * estimatePerBatch;
    const completedBatches = Math.floor(completed.length / 3);
    const elapsedOnCurrentBatch = Math.max(0, elapsedDisplay - (completedBatches * estimatePerBatch));
    const activeBatchPct = activeKeyword
      ? Math.min(elapsedOnCurrentBatch / estimatePerBatch, 0.9)
      : 0;
    const progressPct = Math.min(99, Math.round(((completed.length + activeBatchPct) / total) * 100));

    function formatTime(seconds: number): string {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return m > 0 ? `${m}m ${s}s` : `${s}s`;
    }

    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Searching Meta Ad Library</h2>
          <p className="text-muted-foreground">
            {completed.length < total
              ? `Searching ${Math.min(3, total - completed.length)} keywords in parallel — ~10-30s per batch`
              : "Finishing up..."}
          </p>
        </div>

        {/* Error message banner */}
        {errorMessage && (
          <Card className="border-red-500/20 bg-red-500/10">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-red-200">{errorMessage}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={goToResearch}
                    className="border-red-500/30 hover:bg-red-500/20"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Elapsed time + estimate */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Elapsed: <span className="text-foreground font-mono">{formatTime(elapsedDisplay)}</span></span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Est. total: <span className="text-foreground font-mono">~{formatTime(totalEstimate)}</span></span>
          </div>
        </div>

        <Card className="glass-strong">
          <CardContent className="pt-6 space-y-3">
            {keywords.map((kw, i) => {
              const done = progress.some((p) => p.keyword === kw && p.phase === "keyword-done");
              const failed = progress.some((p) => p.keyword === kw && p.phase === "keyword-error");
              const downloading = progress.some((p) => p.keyword === kw && p.phase === "downloading");
              const active = progress.some((p) => p.keyword === kw && (p.phase === "searching" || p.phase === "searching-progress")) && !done && !failed;
              const searchProgress = progress.find((p) => p.keyword === kw && p.phase === "searching-progress");
              const adsFound = progress.find((p) => p.keyword === kw && p.phase === "keyword-done")?.adsFound;
              const pending = !done && !failed && !active;

              return (
                <div
                  key={kw}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? "bg-white/[0.04]" : ""}`}
                >
                  {done && <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />}
                  {failed && <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />}
                  {active && !downloading && <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />}
                  {active && downloading && <Download className="h-5 w-5 text-blue-400 animate-pulse flex-shrink-0" />}
                  {pending && (
                    <div className="h-5 w-5 rounded-full border border-white/[0.15] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground">{i + 1}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${pending ? "text-muted-foreground" : ""}`}>
                      &quot;{kw}&quot;
                    </span>
                    {active && !downloading && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {searchProgress?.elapsedSeconds
                          ? `Scraping ads... (${searchProgress.elapsedSeconds}s elapsed)`
                          : "Scraping ads from Meta Ad Library..."}
                      </p>
                    )}
                    {active && downloading && downloadCount !== undefined && (
                      <p className="text-[10px] text-blue-400/80 mt-0.5">
                        Saving {downloadCount} ads...
                      </p>
                    )}
                  </div>
                  {done && adsFound !== undefined && (
                    <Badge variant="secondary" className="text-[10px]">
                      {adsFound} ads
                    </Badge>
                  )}
                  {active && !downloading && (
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                      {formatTime(Math.max(0, elapsedOnCurrentBatch))}
                    </span>
                  )}
                </div>
              );
            })}

            <div className="pt-3">
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {completed.length} of {total} keywords complete
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  {progressPct}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results state
  const advertisers = searchState?.advertisers || [];
  const totalAds = searchState?.totalAdsScraped || metaAds.length;
  const adsByAdvertiser = (name: string) => metaAds.filter((a) => a.advertiser === name);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {advertisers.length} Advertisers — {totalAds} Ads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked by performance score (days running + ad volume + creative diversity)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={goToResearch}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Re-search
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
            onClick={() => (window.location.href = "/analysis")}
          >
            Next: Analyze
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </div>

      {/* Keywords used */}
      {searchState?.keywords && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Keywords:</span>
          {searchState.keywords.map((kw) => (
            <Badge key={kw} variant="secondary" className="text-[10px] bg-white/[0.06]">
              {kw}
            </Badge>
          ))}
        </div>
      )}

      {/* Advertiser ranking — 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {advertisers.map((adv, idx) => {
        const isExpanded = expandedAdvertiser === adv.name;
        const advAds = adsByAdvertiser(adv.name);

        return (
          <div key={adv.name} className={`space-y-2 ${isExpanded ? "md:col-span-2 xl:col-span-3" : ""}`}>
            <button
              onClick={() => setExpandedAdvertiser(isExpanded ? null : adv.name)}
              className="w-full text-left"
            >
              <Card className={`glass transition-colors ${isExpanded ? "border-white/[0.12]" : "hover:border-white/[0.1]"}`}>
                <CardContent className="py-3 px-4 space-y-3">
                  {/* Compact header: rank + name + badges + chevron */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">
                      #{idx + 1}
                    </span>
                    <h3 className="text-sm font-semibold">{adv.name}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                      <Badge variant="secondary" className="text-[10px]">
                        {adv.totalAds} ads
                      </Badge>
                      {adv.activeAds > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-green-500/15 text-green-400 border-green-500/20">
                          {adv.activeAds} active
                        </Badge>
                      )}
                      {adv.maxDaysRunning > 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-400 border-amber-500/20">
                          {adv.maxDaysRunning}d
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/20">
                        {adv.score}
                      </Badge>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                      )}
                    </div>
                  </div>
                  {/* Thumbnail grid — fills card width */}
                  {advAds.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {advAds.slice(0, 4).map((ad) => {
                        const thumbSrc = ad.localImagePath
                          ? `/api/proxy-image?path=${encodeURIComponent(ad.localImagePath)}`
                          : ad.imageUrl
                            ? `/api/proxy-image?url=${encodeURIComponent(ad.imageUrl)}`
                            : null;
                        return thumbSrc ? (
                          <div
                            key={ad.id}
                            className="relative aspect-[4/5] rounded-lg overflow-hidden bg-white/[0.04] hover:ring-1 hover:ring-white/[0.15] transition-all"
                          >
                            <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                            {ad.videoUrl && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50">
                                  <Play className="h-3 w-3 text-white ml-0.5" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })}
                      {advAds.length > 4 && (
                        <div className="aspect-[4/5] rounded-lg bg-white/[0.04] flex items-center justify-center text-sm text-muted-foreground border border-white/[0.06]">
                          +{advAds.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>

            {isExpanded && advAds.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pl-12">
                {advAds.map((ad) => (
                  <MetaAdCard
                    key={ad.id}
                    adId={ad.id}
                    imageUrl={ad.imageUrl}
                    localImagePath={ad.localImagePath}
                    videoUrl={ad.videoUrl}
                    primaryText={ad.primaryText}
                    headline={ad.headline}
                    description={ad.description}
                    ctaText={ad.ctaText}
                    platforms={ad.platforms}
                    daysRunning={ad.daysRunning}
                    isActive={ad.isActive}
                    linkUrl={ad.linkUrl}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
      </div>

      {advertisers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No advertiser data yet. Click &quot;Re-search&quot; to start.</p>
        </div>
      )}
    </div>
  );
}
