"use client";

import { useEffect, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MarkdownContent } from "@/components/markdown-content";

interface KnowledgeEntry {
  id: string;
  videoTitle: string;
  channelName: string;
  thumbnailUrl: string;
  videoUrl: string;
  dateAnalyzed: string;
  tactics: string;
  summary: string;
}

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedContent, setExpandedContent] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data) => {
        setEntries(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleExpand(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    try {
      const res = await fetch(`/api/knowledge?id=${id}`);
      const data = await res.json();
      setExpandedContent(data.content || "");
    } catch {
      setExpandedContent("Failed to load content.");
    }
  }

  const filtered = search
    ? entries.filter(
        (e) =>
          e.videoTitle.toLowerCase().includes(search.toLowerCase()) ||
          e.channelName.toLowerCase().includes(search.toLowerCase()) ||
          e.tactics.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading knowledge base...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          No knowledge entries yet.{" "}
          <a href="/run" className="text-primary underline">
            Run the pipeline
          </a>{" "}
          to analyze YouTube videos and build your knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tactics..."
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {filtered.length} videos analyzed
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((entry) => (
          <Card
            key={entry.id}
            className={`glass cursor-pointer transition-all duration-200 hover:border-white/[0.12] ${expanded === entry.id ? "md:col-span-2" : ""}`}
            onClick={() => handleExpand(entry.id)}
          >
            <CardContent className="pt-4">
              <div className="flex gap-4">
                {entry.thumbnailUrl && (
                  <div className="flex-shrink-0 w-44 aspect-video rounded-lg overflow-hidden bg-white/[0.04]">
                    <img
                      src={entry.thumbnailUrl}
                      alt={entry.videoTitle}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">
                    {entry.videoTitle || "Untitled Video"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {entry.channelName}
                    {entry.dateAnalyzed &&
                      ` · Analyzed ${new Date(entry.dateAnalyzed).toLocaleDateString()}`}
                  </p>
                  {expanded !== entry.id && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {entry.summary || entry.tactics}
                    </p>
                  )}
                </div>
              </div>

              {expanded === entry.id && (
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {expandedContent ? (
                    <MarkdownContent content={expandedContent} />
                  ) : (
                    <MarkdownContent
                      content={entry.tactics || entry.summary || "No content available."}
                    />
                  )}
                  <div className="mt-4">
                    <a
                      href={entry.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Watch on YouTube →
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
