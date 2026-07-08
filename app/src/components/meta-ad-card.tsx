"use client";

import { useState, useRef } from "react";
import { Clock, ExternalLink, ImageIcon, Play, Volume2, VolumeX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface MetaAdCardProps {
  imageSrc?: string;
  imageUrl?: string;
  localImagePath?: string;
  videoUrl?: string;
  adId?: string;
  primaryText: string;
  headline: string;
  description?: string;
  ctaText: string;
  platforms?: string;
  daysRunning?: number;
  isActive?: boolean;
  linkUrl?: string;
  variant?: "compact" | "full";
  showCopy?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export function MetaAdCard({
  imageSrc,
  imageUrl,
  localImagePath,
  videoUrl,
  adId,
  primaryText,
  headline,
  description,
  ctaText,
  platforms,
  daysRunning,
  isActive,
  linkUrl,
  variant = "compact",
  showCopy = true,
  onClick,
  selected,
}: MetaAdCardProps) {
  const [textExpanded, setTextExpanded] = useState(false);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const imgSrc = imageSrc
    ? imageSrc
    : localImagePath
      ? `/api/proxy-image?path=${encodeURIComponent(localImagePath)}`
      : imageUrl
        ? `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`
        : null;

  const platformList = platforms
    ? platforms.split(",").map((p) => p.trim()).filter(Boolean)
    : [];

  const truncatedText =
    primaryText && primaryText.length > 120 && !textExpanded
      ? primaryText.slice(0, 120) + "..."
      : primaryText;

  const isCompact = variant === "compact";

  const adLibraryUrl = adId
    ? `https://www.facebook.com/ads/library/?id=${adId}`
    : null;

  function handlePlayVideo(e: React.MouseEvent) {
    e.stopPropagation();
    if (videoUrl) {
      setPlayingVideo(true);
      setPaused(false);
    }
  }

  function handleTogglePause(e: React.MouseEvent) {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setPaused(false);
      } else {
        videoRef.current.pause();
        setPaused(true);
      }
    }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    setMuted(!muted);
    if (videoRef.current) {
      videoRef.current.muted = !muted;
    }
  }

  const embeddedMedia = (
    <div className="flex items-center justify-center">
      {playingVideo && videoUrl ? (
        <div className="relative rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted={muted}
            loop
            playsInline
            className="max-h-[320px] w-auto rounded-xl cursor-pointer"
            onClick={handleTogglePause}
            onError={() => setPlayingVideo(false)}
          />
          {paused && (
            <button
              onClick={handleTogglePause}
              className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60">
                <Play className="h-4 w-4 text-white ml-0.5" />
              </div>
            </button>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            >
              {muted ? <VolumeX className="h-3 w-3 text-white" /> : <Volume2 className="h-3 w-3 text-white" />}
            </button>
          </div>
          {isActive !== undefined && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={`text-[10px] ${isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/[0.08] text-muted-foreground"}`}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}
          {videoUrl && !paused && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-white/20">Video</Badge>
            </div>
          )}
        </div>
      ) : imgSrc ? (
        <div className="relative">
          <img
            src={imgSrc}
            alt={headline || "Ad creative"}
            className="max-h-[320px] w-auto rounded-xl"
          />
          {videoUrl && (
            <button
              onClick={handlePlayVideo}
              className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-colors group rounded-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 group-hover:bg-black/70 group-hover:scale-110 transition-all">
                <Play className="h-4 w-4 text-white ml-0.5" />
              </div>
            </button>
          )}
          {isActive !== undefined && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className={`text-[10px] ${isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/[0.08] text-muted-foreground"}`}>
                {isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          )}
          {videoUrl && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-white/20">Video</Badge>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-[200px] w-full rounded-xl bg-white/[0.02]">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}
    </div>
  );

  if (!showCopy) {
    return (
      <div
        className={`${onClick ? "cursor-pointer" : ""} ${selected ? "ring-1 ring-purple-500/20" : ""}`}
        onClick={onClick}
      >
        {embeddedMedia}
      </div>
    );
  }

  const cardMedia = (
    <div className={`relative bg-white/[0.02] ${isCompact ? "aspect-square" : "aspect-[4/3]"}`}>
      {playingVideo && videoUrl ? (
        <>
          <video
            ref={videoRef}
            src={videoUrl}
            autoPlay
            muted={muted}
            loop
            playsInline
            className="w-full h-full object-cover cursor-pointer"
            onClick={handleTogglePause}
            onError={() => setPlayingVideo(false)}
          />
          {paused && (
            <button
              onClick={handleTogglePause}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            </button>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5 text-white" /> : <Volume2 className="h-3.5 w-3.5 text-white" />}
            </button>
          </div>
        </>
      ) : imgSrc ? (
        <>
          <img
            src={imgSrc}
            alt={headline || "Ad creative"}
            className="w-full h-full object-cover"
          />
          {videoUrl && (
            <button
              onClick={handlePlayVideo}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 group-hover:bg-black/80 group-hover:scale-110 transition-all">
                <Play className="h-5 w-5 text-white ml-0.5" />
              </div>
            </button>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
        </div>
      )}

      {isActive !== undefined && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className={`text-[10px] ${isActive ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-white/[0.08] text-muted-foreground"}`}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      )}

      {videoUrl && !playingVideo && (
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="text-[10px] bg-black/50 text-white border-white/20">Video</Badge>
        </div>
      )}
    </div>
  );

  return (
    <Card
      className={`glass overflow-hidden transition-all duration-200 hover:border-white/[0.15] ${
        onClick ? "cursor-pointer" : ""
      } ${selected ? "border-purple-500/40 ring-1 ring-purple-500/20" : ""}`}
      onClick={onClick}
    >
      {cardMedia}

      <CardContent className="p-4 space-y-2.5">
        {primaryText && (
          <div className="text-sm text-foreground/90 leading-relaxed">
            <p>{truncatedText}</p>
            {primaryText.length > 120 && !textExpanded && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setTextExpanded(true);
                }}
                className="text-primary text-xs mt-0.5 hover:underline"
              >
                See more
              </button>
            )}
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-2.5">
          {headline && (
            <p className="font-semibold text-sm leading-tight">{headline}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {ctaText && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-white/[0.08] border border-white/[0.1] text-foreground/80">
              {ctaText}
              {linkUrl && <ExternalLink className="h-2.5 w-2.5" />}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {daysRunning !== undefined && daysRunning > 0 && (
            <Badge
              variant="secondary"
              className={`text-[10px] gap-1 ${
                daysRunning >= 30
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                  : "bg-white/[0.06] text-muted-foreground"
              }`}
            >
              <Clock className="h-2.5 w-2.5" />
              {daysRunning}d
            </Badge>
          )}
          {platformList.map((p) => (
            <Badge
              key={p}
              variant="secondary"
              className="text-[10px] bg-white/[0.04] text-muted-foreground border-white/[0.06]"
            >
              {p}
            </Badge>
          ))}
          {adLibraryUrl && (
            <a
              href={adLibraryUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors ml-auto"
            >
              <ExternalLink className="h-2.5 w-2.5" />
              Ad Library
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
