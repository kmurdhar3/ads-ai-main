# YouTube Content Analysis Implementation

## Overview

Enhanced brand context collection to analyze actual YouTube video content (transcripts) instead of just scraping channel metadata.

## What Changed

### 1. Enhanced YouTube Scraping (`apify.ts`)

**Before:**
- Only scraped basic channel metadata (name, description, subscriber count)
- Returned a single `YouTubeVideo` object

**After:**
- Scrapes up to 3 recent videos from the channel
- Downloads video transcripts via `bernardo~youtube-scraper` Apify actor
- Returns `YouTubeChannelData` with:
  - Channel metadata (name, URL, description, subscribers)
  - Array of videos with transcripts

```typescript
export interface YouTubeChannelData {
  channelName: string;
  channelUrl: string;
  description: string;
  subscriberCount: number;
  videos: YouTubeVideo[];  // Each video has transcript field
}
```

### 2. AI Content Analysis (`claude-youtube.ts`)

New module that analyzes video transcripts with Claude to extract:

- **Brand Themes** - 3-5 main themes (e.g., "productivity", "wellness", "entrepreneurship")
- **Tone** - Communication style (e.g., "professional and authoritative", "casual and friendly")
- **Messaging** - Core value proposition
- **Target Audience** - Who they're speaking to
- **Content Style** - Visual and narrative patterns
- **Key Topics** - Specific recurring topics or product categories

**How it works:**
1. Takes up to 3 videos with transcripts
2. Extracts first 2000 chars of each transcript
3. Sends to Claude Sonnet 4.5 with structured prompt
4. Returns JSON analysis

### 3. Updated Brand Context Type

Added `youtubeContentAnalysis` field to `BrandContext`:

```typescript
youtubeContentAnalysis?: {
  brandThemes: string[];
  tone: string;
  messaging: string;
  targetAudience: string;
  contentStyle: string;
  keyTopics: string[];
};
```

### 4. Brand API Integration

**Scraping flow** (`/api/brand` POST):
1. Scrape channel metadata + 3 recent videos with transcripts
2. If videos found → analyze content with Claude
3. Store analysis in `brand-context.json`

**SSE Progress events:**
- `youtube` - Starting scrape
- `youtube-scraped` - Videos downloaded (shows count)
- `youtube-analyzing` - AI analysis starting
- `youtube-analyzed` - Analysis complete
- `youtube-done` - Full process complete

### 5. Brand Page UI

**Input form:**
- Changed from 2-column to 3-column grid (`md:grid-cols-3`)
- Added YouTube URL input field with Video icon

**Display:**
- YouTube Content Analysis card in collapsible Details section
- Shows:
  - Core Message
  - Tone
  - Target Audience
  - Brand Themes (as badges)
  - Key Topics (as purple badges)

## How to Use

1. **Via Web Form** (`/brand` page):
   - Enter Website URL (required)
   - Enter Instagram Handle (optional)
   - Enter YouTube Channel URL (optional, e.g., `https://youtube.com/@channelname`)
   - Click "Scrape Brand"

2. **What happens:**
   - Crawls website
   - Scrapes Instagram profile + posts
   - Scrapes YouTube channel + 3 recent videos
   - Downloads video transcripts
   - Analyzes video content with AI
   - Stores all data in `brand-context.json`

3. **View results:**
   - Brand identity shows YouTube channel name + subscriber count
   - Expand "Details" section to see YouTube Content Analysis

## Technical Details

### Apify Actors Used

1. **`streamers~youtube-scraper`** - Channel metadata
   - Input: `{ startUrls: [channelUrl], maxResults: 1 }`
   - Returns: channel name, description, subscriber count

2. **`bernardo~youtube-scraper`** - Video transcripts
   - Input: `{ startUrls: [channelUrl], maxResults: 3, downloadSubtitles: true }`
   - Returns: video metadata + transcripts in `subtitles` field

### Claude Analysis Prompt

Sends 3 video excerpts (title + first 2000 chars of transcript) and asks for structured JSON analysis covering:
- Brand themes (array)
- Tone (string)
- Messaging (string)
- Target audience (string)
- Content style (string)
- Key topics (array)

### Data Storage

**`data/brand-context.json`:**
```json
{
  "name": "Brand Name",
  "youtubeChannelName": "Channel Name",
  "youtubeChannelUrl": "https://youtube.com/@channel",
  "youtubeSubscribers": 50000,
  "youtubeContentAnalysis": {
    "brandThemes": ["productivity", "wellness"],
    "tone": "inspirational and motivational",
    "messaging": "Transform your daily routine",
    "targetAudience": "Busy professionals seeking balance",
    "contentStyle": "Cinematic B-roll with voiceover",
    "keyTopics": ["morning routines", "time management", "mindfulness"]
  },
  "sources": [
    { "type": "website", ... },
    { "type": "instagram", ... },
    { "type": "youtube", "url": "...", "description": "Channel Name (3 videos analyzed)" }
  ]
}
```

## Files Modified

- [app/src/lib/apify.ts](../app/src/lib/apify.ts) - Enhanced YouTube scraping
- [app/src/lib/claude-youtube.ts](../app/src/lib/claude-youtube.ts) - New AI analysis module
- [app/src/lib/types.ts](../app/src/lib/types.ts) - Added `youtubeContentAnalysis` field
- [app/src/app/api/brand/route.ts](../app/src/app/api/brand/route.ts) - Integrated video analysis
- [app/src/app/brand/page.tsx](../app/src/app/brand/page.tsx) - UI for input and display

## What This Enables

**Before:** YouTube scraping only pulled channel name and subscriber count — no content insight.

**After:** Deep understanding of:
- What topics the brand covers
- How they communicate (tone and style)
- Who their audience is
- What themes define their content
- What products/categories they focus on

This data enriches ad generation by:
1. Informing copy tone to match brand voice
2. Identifying key themes to emphasize
3. Understanding target audience for better targeting
4. Surfacing product categories from video content

## Example Output

For a productivity YouTube channel:

```
Brand Themes: productivity, time management, morning routines, goal setting
Tone: Inspirational and motivational with practical advice
Messaging: Transform your daily habits to achieve more with less stress
Target Audience: Young professionals and entrepreneurs aged 25-40
Content Style: Cinematic visuals with direct-to-camera talking head segments
Key Topics: Notion workspace setup, habit tracking, deep work, digital minimalism
```

This gives the ad generator concrete themes, messaging angles, and audience insights that would be impossible to extract from just a channel description.
