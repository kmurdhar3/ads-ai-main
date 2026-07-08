"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PipelineProvider, usePipeline } from "@/context/pipeline-context";

interface PipelineProgress {
  phase: string;
  step: string;
  message: string;
  progress: number;
  errors: string[];
  log: string[];
}

function RunPageInner() {
  const { isRunning, setIsRunning } = usePipeline();
  const [websiteUrl, setWebsiteUrl] = useState("https://bloomnu.com/");
  const [instagramHandle, setInstagramHandle] = useState("bloomsupps");
  const [competitors, setCompetitors] = useState(
    "AG1, Huel, Orgain, Garden of Life, Vital Proteins, Aloha"
  );
  const [phases, setPhases] = useState<string[]>([]);
  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  async function handleRun() {
    setIsRunning(true);
    setProgress(null);
    setLog([]);

    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl,
          instagramHandle,
          competitors,
          phases: phases.length > 0 ? phases : undefined,
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
              const data: PipelineProgress = JSON.parse(line.slice(6));
              setProgress(data);
              setLog(data.log || []);
            } catch {
              // skip malformed SSE
            }
          }
        }
      }
    } catch (e) {
      setLog((prev) => [...prev, `Error: ${e}`]);
    }

    setIsRunning(false);
  }

  const phaseOptions = [
    { value: "brand", label: "Brand Setup" },
    { value: "competitors", label: "Competitor Analysis" },
  ];

  const phaseColors: Record<string, string> = {
    brand: "from-blue-500 to-cyan-500",
    competitors: "from-orange-500 to-red-500",
    done: "from-green-500 to-emerald-500",
    error: "from-red-500 to-red-700",
  };

  return (
    <div className="space-y-6">
      <Card className="glass-strong">
        <CardHeader>
          <CardTitle className="text-lg">Pipeline Configuration</CardTitle>
          <CardDescription>
            Scrape your brand data and analyze competitor ads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Instagram Handle</Label>
              <Input
                value={instagramHandle}
                onChange={(e) => setInstagramHandle(e.target.value)}
                placeholder="username"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Competitors (comma-separated)</Label>
            <Input
              value={competitors}
              onChange={(e) => setCompetitors(e.target.value)}
              placeholder="Brand A, Brand B, Brand C"
            />
          </div>

          <div className="space-y-2">
            <Label>Phases to Run</Label>
            <div className="flex gap-2 flex-wrap">
              {phaseOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setPhases((prev) =>
                      prev.includes(opt.value)
                        ? prev.filter((p) => p !== opt.value)
                        : [...prev, opt.value]
                    )
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    phases.length === 0 || phases.includes(opt.value)
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "bg-white/[0.04] text-muted-foreground border border-white/[0.06]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {phases.length > 0 && (
                <button
                  onClick={() => setPhases([])}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Run All
                </button>
              )}
            </div>
          </div>

          <Button
            onClick={handleRun}
            disabled={isRunning}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white w-full"
            size="lg"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isRunning ? "Running Pipeline..." : "Start Pipeline"}
          </Button>
        </CardContent>
      </Card>

      {(progress || log.length > 0) && (
        <Card className="glass">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {progress?.phase === "done" ? (
                  <span className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Pipeline Complete
                  </span>
                ) : progress?.phase === "error" ? (
                  <span className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    Pipeline Error
                  </span>
                ) : (
                  "Pipeline Progress"
                )}
              </CardTitle>
              {progress && (
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress.progress)}%
                </span>
              )}
            </div>
            {progress && (
              <div className="w-full h-2 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${phaseColors[progress.phase] || "from-purple-500 to-indigo-500"} transition-all duration-500`}
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            )}
          </CardHeader>
          <CardContent>
            {progress?.message && (
              <p className="text-sm mb-3">{progress.message}</p>
            )}

            <ScrollArea className="h-64 rounded-lg bg-black/30 p-4">
              <div ref={logRef} className="space-y-1 font-mono text-xs">
                {log.map((line, i) => (
                  <div
                    key={i}
                    className={`${line.includes("error") || line.includes("failed") ? "text-red-400" : line.includes("done") || line.includes("saved") ? "text-green-400" : "text-muted-foreground"}`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {progress?.errors && progress.errors.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
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

            {progress?.phase === "done" && (
              <div className="mt-4 flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/create")}
                >
                  Create Ads →
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/competitors")}
                >
                  View Competitors →
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function RunPage() {
  return (
    <PipelineProvider>
      <RunPageInner />
    </PipelineProvider>
  );
}
