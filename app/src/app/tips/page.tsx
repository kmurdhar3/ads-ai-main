"use client";

import { useEffect, useState } from "react";
import { Lightbulb, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarkdownContent } from "@/components/markdown-content";

export default function TipsPage() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    fetch("/api/tips")
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/tips", { method: "POST" });
      const data = await res.json();
      if (data.content) setContent(data.content);
    } catch (e) {
      console.error("Regeneration failed:", e);
    }
    setRegenerating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading tips...</p>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Lightbulb className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center max-w-md">
          No beginner tips generated yet. Run the pipeline first to build a
          knowledge base, then generate tips from expert insights.
        </p>
        <Button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
        >
          {regenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Lightbulb className="h-4 w-4 mr-2" />
          )}
          Generate Tips
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Auto-generated from expert YouTube knowledge base
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? (
            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3 mr-2" />
          )}
          Regenerate
        </Button>
      </div>

      <Card className="glass-strong">
        <CardContent className="pt-6">
          <MarkdownContent content={content} />
        </CardContent>
      </Card>
    </div>
  );
}
