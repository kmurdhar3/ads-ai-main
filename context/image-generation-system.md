# Image Generation System

## Overview

The image generation system creates AI images that replicate competitor ad visuals but feature the brand's product. It detects the competitor ad's aspect ratio (9:16, 4:5, or 1:1) and generates a matching format.

**Service**: Kie.ai — "Nano Banana Pro" model

## Implementation

**File**: `app/src/lib/kie-ai.ts`

### Input
```typescript
generateAdImage(
  prompt: string,                  // Detailed image description
  referenceImageUrls: string[],    // Competitor ad URLs (up to 8)
  options: { aspectRatio?: string } // "1:1" | "4:5" | "9:16"
)
```

### Process

#### Step 1: Detect Aspect Ratio

**File**: `app/src/app/api/create/batch/route.ts`

Reads the **downloaded competitor ad image** and parses dimensions from the file header:

```typescript
function detectAspectRatio(ad: MetaAdEntry): "1:1" | "9:16" | "4:5" {
  if (!ad.localImagePath) return "1:1";
  
  const imgPath = path.join(DATA_DIR, ad.localImagePath);
  const buf = fs.readFileSync(imgPath);
  
  const dims = getImageDimensions(buf);  // Parse PNG/JPEG/WebP
  if (!dims) return "1:1";
  
  const ratio = dims.height / dims.width;
  
  if (ratio > 1.4) return "9:16";  // Vertical (1080×1920)
  if (ratio > 1.1) return "4:5";   // Feed (1080×1350)
  return "1:1";                    // Square (1080×1080)
}
```

**Header Parsing** (no external libraries):

```typescript
function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: bytes 16-23 contain width and height (4-byte big-endian)
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  
  // JPEG: scan for SOF0/SOF2 markers (0xFFC0, 0xFFC2)
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        return { width, height };
      }
      const segLen = buf.readUInt16BE(i + 2);
      i += 2 + segLen;
    }
  }
  
  // WebP: RIFF header + VP8 chunk
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45) {
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
      const width = buf.readUInt16LE(26) & 0x3FFF;
      const height = buf.readUInt16LE(28) & 0x3FFF;
      return { width, height };
    }
  }
  
  return null;
}
```

**Why Parse Headers?**
- No dependencies (no `sharp`, no `image-size`)
- Fast (~1ms per image)
- Works for 99% of images (PNG, JPEG, WebP)

#### Step 2: Create Kie.ai Task

```typescript
POST https://api.kie.ai/api/v1/jobs/createTask

Headers:
  Authorization: Bearer {KIE_AI_API_KEY}

Body:
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Bold white text 'STILL OVERPAYING?' at top in sans-serif font. Below: product shot of blue protein bottle on gradient purple-to-black background. Bottom right: '20G PROTEIN' in yellow badge. Clean, modern, high-contrast design.",
    "image_input": ["https://meta-cdn.com/competitor-ad.jpg"],
    "aspect_ratio": "9:16",
    "output_format": "png"
  }
}
```

**Response**:
```json
{
  "data": {
    "taskId": "abc123xyz"
  }
}
```

**Error Handling** (insufficient credits):
```json
{
  "code": 402,
  "msg": "Insufficient credits"
}
```

#### Step 3: Poll for Completion

```typescript
for (let i = 0; i < 80; i++) {  // 80 polls × 3s = 4 min timeout
  await new Promise((r) => setTimeout(r, 3000));  // Sleep 3s
  
  const statusRes = await fetch(
    `${BASE_URL}/recordInfo?taskId=${taskId}`,
    { headers: { Authorization: `Bearer ${KIE_AI_API_KEY}` } }
  );
  
  const result = await statusRes.json();
  const state = result.data?.state;
  
  // Log progress every 10 polls
  if (i % 10 === 0) {
    console.log(`[Kie.ai] Poll ${i}/80 - State: ${state || 'unknown'}`);
  }
  
  if (state === "success") {
    const resultJson = JSON.parse(result.data.resultJson || "{}");
    const imageUrl = resultJson.resultUrls?.[0];
    if (!imageUrl) throw new Error("No image URL in result");
    
    const savedPath = await downloadGeneratedImage(imageUrl, taskId);
    return savedPath || imageUrl;
  }
  
  if (state === "failed") {
    throw new Error(`Image generation failed: ${result.data?.failMsg}`);
  }
}

throw new Error("Image generation timed out after 4 minutes");
```

**Polling Strategy**:
- Poll every 3 seconds
- Max 80 polls = 240 seconds (4 minutes)
- Log progress every 10th poll (`Poll 0/80`, `Poll 10/80`, ...)
- Success → download image
- Failed → throw error with reason
- Timeout → throw timeout error

**Typical Duration**: 30-90 seconds

#### Step 4: Download & Store Locally

```typescript
async function downloadGeneratedImage(
  url: string,
  taskId: string
): Promise<string | null> {
  try {
    const dir = path.join(DATA_DIR, "generated-images");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    const res = await fetch(url);
    if (!res.ok) return null;
    
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = `${taskId}.png`;
    
    fs.writeFileSync(path.join(dir, filename), buffer);
    
    // Return proxy path (not CDN URL — it may expire)
    return `/api/proxy-image?path=generated-images/${filename}`;
  } catch {
    return null;
  }
}
```

**Storage Location**: `data/generated-images/{taskId}.png`

**Why Download Locally?**
- Kie.ai CDN URLs may expire
- Meta CDN URLs definitely expire (24-48 hours)
- Local storage ensures concepts remain viewable indefinitely
- `/api/proxy-image` serves them with proper CORS headers

### Output

```typescript
concept.generatedImageUrl = "/api/proxy-image?path=generated-images/abc123xyz.png"
```

## Image Prompt Structure

### Critical Principle
Most high-performing social media ads are **designed graphics with text baked into the image**, not just product photos.

### Good Image Prompt
```
Bold white text 'STILL OVERPAYING?' centered at top in modern sans-serif 
font, all caps. Below: close-up product shot of clear blue protein bottle 
with condensation drops, centered on gradient background (purple #A855F7 
top to black bottom). Bottom right corner: yellow rounded badge with 
'20G PROTEIN' in black bold text. Clean, high-contrast, minimalist 
design. Instagram Stories 9:16 vertical format.
```

**Includes**:
1. **Layout** — where text goes (top, center, bottom, corner)
2. **Typography** — font style (sans-serif, bold, all-caps)
3. **Exact text** — "STILL OVERPAYING?", "20G PROTEIN"
4. **Background** — gradient, product photo, solid color
5. **Color scheme** — specific hex codes or brand colors
6. **Overall mood** — clean, high-contrast, minimalist

### Bad Image Prompt
```
A protein bottle
```

**Result**: Just a product photo, not an ad graphic. Missing text overlays, layout, styling.

## Aspect Ratio Mapping

| Ratio | Placement | Dimensions | Use Case |
|-------|-----------|------------|----------|
| `9:16` | Instagram Stories, Reels | 1080×1920 | Vertical video/full-screen |
| `4:5` | Instagram Feed | 1080×1350 | Slightly tall feed post |
| `1:1` | Facebook Feed | 1080×1080 | Square feed post |

**Why Match Competitor's Format?**
If a competitor's ad ran for 90 days in 9:16 format, that format is part of the winning strategy. Generate 9:16, not 1:1.

## Real-World Example

### Competitor Ad Analysis
```
File: data/competitor-ads/bloom/1234567890.png
Dimensions: 1080×1920 (from PNG header)
Ratio: 1920 / 1080 = 1.78
Format: 9:16 (vertical video)
```

### Generated Prompt
```
Close-up shot of person's disgusted facial expression while drinking 
thick protein shake. Bold white text overlay at top: 'STILL FORCING 
DOWN CHALKY SHAKES?' in sans-serif font. Dark teal gradient background. 
Dramatic lighting. Instagram Reels 9:16 vertical format. High contrast, 
attention-grabbing visual.
```

### Kie.ai Task
```json
{
  "model": "nano-banana-pro",
  "input": {
    "prompt": "Close-up shot of person's disgusted facial expression...",
    "image_input": ["https://meta-cdn.com/competitor-1234567890.jpg"],
    "aspect_ratio": "9:16",  ← Matches competitor format
    "output_format": "png"
  }
}
```

### Polling Log
```
[Kie.ai] Task created: xyz789abc
[Kie.ai] Poll 0/80 - State: processing
[Kie.ai] Poll 10/80 - State: processing
[Kie.ai] Poll 20/80 - State: processing
[Kie.ai] Poll 30/80 - State: success
[Kie.ai] Image generated successfully
```

### Final Output
```
File: data/generated-images/xyz789abc.png
URL: /api/proxy-image?path=generated-images/xyz789abc.png
Format: 9:16 (1080×1920)
```

## Performance

**Per Image**:
- Time: 30-90 seconds (average ~60s)
- API calls: 1 create + 20-30 polling requests
- Cost: ~$0.01 per image

**Batch Generation (10 concepts, 3 parallel)**:
- Images generated in parallel batches of 3
- Total time: ~2-3 minutes for 10 images
- Total cost: ~$0.10

## Error Handling

### Insufficient Credits
```json
{
  "code": 402,
  "msg": "Insufficient credits"
}
```
**Action**: Throw error immediately (no polling)

### Generation Failed
```json
{
  "data": {
    "state": "failed",
    "failMsg": "NSFW content detected"
  }
}
```
**Action**: Log error, skip image (concept still created without image)

### Timeout (4 minutes)
**Action**: Throw timeout error, concept marked as failed

### Download Failed
**Action**: Return CDN URL instead of proxy path (fallback)

## Related Files

- `app/src/lib/kie-ai.ts` — Image generation API wrapper
- `app/src/app/api/create/batch/route.ts` — Calls `generateAdImage()` + aspect ratio detection
- `app/src/app/api/proxy-image/route.ts` — Serves local images
- `data/generated-images/` — Storage directory

## Design Decisions

### Why Poll Every 3 Seconds?
Balance between responsiveness and API rate limits. 2s feels too aggressive, 5s feels laggy.

### Why 4-Minute Timeout?
Most images generate in 30-90s. 4 minutes allows for slow cases without hanging indefinitely.

### Why Parse Image Dimensions from Headers?
- **No dependencies**: Libraries like `sharp` add 20+ MB to deployment
- **Fast**: ~1ms per image (vs ~50ms for full library load)
- **Sufficient**: Handles PNG/JPEG/WebP (99% of Meta ads)

### Why Download Locally vs. Hotlink?
- **Persistence**: CDN URLs expire
- **Control**: Can optimize, resize, cache locally
- **Reliability**: External URLs can 404

### Why Not Generate Video?
Video generation is 10-100x more expensive ($1-10 per video) and takes 5-20 minutes. Current system generates a **key frame** (thumbnail) + **video script**. Users produce the actual video separately.

## Future Enhancements

### Potential Improvements
1. **Local image generation** (Stable Diffusion on GPU server)
   - Pro: No API costs, faster, more control
   - Con: Requires GPU infrastructure, model maintenance

2. **Multiple image variations** (A/B testing)
   - Generate 2-3 variations per concept
   - User picks best

3. **Video generation** (via Runway, Pika, or Luma)
   - Cost: $1-10 per video
   - Time: 5-20 minutes
   - Value: End-to-end video ad creation

4. **Aspect ratio override**
   - User manually selects format (override auto-detection)
   - Useful when competitor ran multiple formats

## Testing

Run: `cd app && npx vitest run`

Tests cover:
- Aspect ratio detection (edge cases: square, vertical, horizontal)
- Image dimension parsing (PNG, JPEG, WebP formats)
- Error handling (timeout, failed generation, insufficient credits)
