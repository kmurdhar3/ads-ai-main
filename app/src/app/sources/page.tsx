"use client";

import { useEffect, useState } from "react";
import { FileText, ExternalLink, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Source {
  id: string;
  type: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  channelName: string;
  dateScraped: string;
  description: string;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((data) => {
        const entries = Array.isArray(data) ? data : [];
        setSources(
          entries.map(
            (e: {
              id: string;
              videoTitle: string;
              videoUrl: string;
              thumbnailUrl: string;
              channelName: string;
              dateAnalyzed: string;
              summary: string;
            }) => ({
              id: e.id,
              type: "youtube",
              title: e.videoTitle,
              url: e.videoUrl,
              thumbnailUrl: e.thumbnailUrl,
              channelName: e.channelName,
              dateScraped: e.dateAnalyzed,
              description: e.summary,
            })
          )
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-muted-foreground">Loading sources...</p>
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          No sources yet.{" "}
          <a href="/run" className="text-primary underline">
            Run the pipeline
          </a>{" "}
          to analyze YouTube videos and build your sources.
        </p>
      </div>
    );
  }

  const youtubeSources = sources.filter((s) => s.type === "youtube");

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-1">YouTube Expert Videos</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {youtubeSources.length} videos analyzed for ad tactics and strategies
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {youtubeSources.map((source) => (
            <Card key={source.id} className="glass hover:border-white/[0.12] transition-all duration-200">
              <CardContent className="pt-4">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-white/[0.04] mb-3">
                    {source.thumbnailUrl ? (
                      <img
                        src={source.thumbnailUrl}
                        alt={source.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>

                  <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                    {source.title || "Untitled Video"}
                  </h4>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">
                      {source.channelName}
                    </span>
                    {source.dateScraped && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(source.dateScraped).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  {source.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {source.description}
                    </p>
                  )}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
