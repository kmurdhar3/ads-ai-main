import Anthropic from "@anthropic-ai/sdk";
import { Brand, BrandContext, Product, AdConcept, MetaAdEntry, AnalysisResult, HookAnalysis } from "./types";

const client = new Anthropic();

export async function analyzeCompetitorAd(
  ad: { headline: string; body: string; ctaText: string; imageUrl: string },
  brand: BrandContext | Brand
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are an expert ad analyst. Analyze this competitor ad and identify what makes it effective or ineffective.

Brand context: ${brand.name} (${("url" in brand ? brand.url : "") || ""}) — ${brand.description}

Competitor Ad:
- Headline: ${ad.headline}
- Body: ${ad.body}
- CTA: ${ad.ctaText}

Provide analysis in these sections:
## Hook Analysis
What grabs attention in the first line/visual?

## Copywriting Structure
Break down the headline, body, and CTA patterns used.

## Strengths
What's working well?

## Weaknesses
What could be improved?

## Takeaways for ${brand.name}
What can we learn and apply?`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}

export async function generateAdConcept(
  brand: BrandContext | Brand,
  products: Product[],
  knowledgeTactics: string,
  competitorInsights: string,
  competitorAds: MetaAdEntry[],
  options: {
    productName?: string;
    format?: string;
    targetAudience?: string;
    style?: string;
  }
): Promise<AdConcept> {
  const selectedProduct = options.productName
    ? products.find((p) => p.name === options.productName)
    : products[0];

  const topAds = competitorAds
    .sort((a, b) => b.daysRunning - a.daysRunning)
    .slice(0, 8);

  const competitorAdExamples = topAds.length > 0
    ? topAds.map((ad) =>
        `[${ad.advertiser} — running ${ad.daysRunning} days, ${ad.isActive ? "ACTIVE" : "inactive"}]\n` +
        `  Primary Text: ${ad.primaryText.slice(0, 200)}\n` +
        `  Headline: ${ad.headline}\n` +
        `  Description: ${ad.description}\n` +
        `  CTA: ${ad.ctaText}\n` +
        `  Platforms: ${ad.platforms}`
      ).join("\n\n")
    : "No competitor ads available";

  const brandColors = ("colors" in brand ? brand.colors : "") || "";
  const brandStyle = ("style" in brand ? brand.style : "") || "";
  const brandTagline = ("tagline" in brand ? brand.tagline : "") || "";

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a world-class Meta ads creative director. Generate a complete ad concept ready for Meta Ads Manager.

## Brand
- Name: ${brand.name}
- Tagline: ${brandTagline}
- Style: ${brandStyle}
- Description: ${brand.description}

## Product
${selectedProduct ? `- Name: ${selectedProduct.name}\n- Description: ${selectedProduct.description}\n- Price: ${selectedProduct.price}` : "General brand ad"}

## Ad Tactics from Expert Knowledge Base
${knowledgeTactics.slice(0, 3000)}

## Competitor Strategy Analysis
${competitorInsights.slice(0, 2000)}

## Best-Performing Competitor Ads (sorted by longevity — longer running = more profitable)
${competitorAdExamples}

## Requirements
- Format: ${options.format || "feed post"}
- Target Audience: ${options.targetAudience || "general"}
- Style: ${options.style || "match brand voice"}

## Meta Ad Structure
A Meta ad has these exact fields:
- **Primary Text**: The main copy above the image (can be multi-line, hooks in first line)
- **Headline**: Bold text below the image (short, punchy, under 40 chars)
- **Description**: Link description below headline (value prop or URL context, under 30 chars)
- **CTA**: Button text (one of: Shop Now, Learn More, Sign Up, Get Offer, Book Now, Download, Watch More, Contact Us)
- **Placements**: Where to run the ad (Facebook Feed, Instagram Feed, Instagram Stories, Instagram Reels, Facebook Reels, Audience Network)

Generate the ad concept in this exact JSON format (no markdown, just JSON):
{
  "primaryText": "The main ad copy (multi-line OK, hook in first line, 2-4 sentences)",
  "headline": "Short bold headline under image",
  "description": "Link description (short value prop)",
  "ctaText": "One of the standard CTA options",
  "placements": ["Facebook Feed", "Instagram Feed"],
  "imagePrompt": "A detailed prompt for generating the ad image. Include specific visual elements, composition, colors, mood. Reference the product and brand aesthetic.",
  "targetAudience": "Who this ad targets",
  "format": "${options.format || "feed post"}",
  "rationale": "Explain which competitor ads and expert tactics informed this concept. Reference specific competitor ads by name if applicable.",
  "inspirationAdIds": ["id1", "id2"]
}

For inspirationAdIds, reference the IDs of competitor ads that most influenced this concept: ${topAds.map((a) => a.id).join(", ")}`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";

  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    parsed = {
      primaryText: text.slice(0, 200),
      headline: "Generated Ad",
      description: "",
      ctaText: "Shop Now",
      placements: ["Facebook Feed", "Instagram Feed"],
      imagePrompt: "",
      targetAudience: options.targetAudience || "",
      format: options.format || "feed post",
      rationale: "",
      inspirationAdIds: [],
    };
  }

  const placements = Array.isArray(parsed.placements)
    ? parsed.placements.join(", ")
    : parsed.placements || "Facebook Feed, Instagram Feed";

  const inspirationAdIds = Array.isArray(parsed.inspirationAdIds)
    ? parsed.inspirationAdIds.join(", ")
    : "";

  return {
    id: `concept-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    headline: parsed.headline || "",
    body: parsed.primaryText || parsed.body || "",
    description: parsed.description || "",
    ctaText: parsed.ctaText || "",
    imagePrompt: parsed.imagePrompt || "",
    generatedImageUrl: "",
    referenceImageUrl: selectedProduct?.imageUrl || "",
    targetAudience: parsed.targetAudience || "",
    format: parsed.format || "feed post",
    placements,
    rationale: parsed.rationale || "",
    productName: selectedProduct?.name || "",
    inspirationAdIds,
    starred: false,
    createdAt: new Date().toISOString(),
  };
}

export async function generateReplicaAdConcept(
  brand: BrandContext | Brand,
  product: Product | null,
  referenceAd: MetaAdEntry,
  knowledgeTactics: string,
  previousFeedback?: string,
  hookAnalysis?: HookAnalysis,
): Promise<AdConcept> {
  const productInfo = product
    ? `- Name: ${product.name}\n- Description: ${product.description}\n- Price: ${product.price}`
    : `General brand ad for ${brand.name}`;

  const brandColors = ("colors" in brand ? brand.colors : "") || "";
  const brandStyle = ("style" in brand ? brand.style : "") || "";
  const brandTagline = ("tagline" in brand ? brand.tagline : "") || "";

  const isVideo = !!referenceAd.videoUrl;

  const feedbackBlock = previousFeedback
    ? `\n## PREVIOUS ATTEMPT FEEDBACK\nA previous version was rejected. Fix these issues:\n${previousFeedback}\n`
    : "";

  const hookBlock = hookAnalysis
    ? `\n## HOOK ANALYSIS (CRITICAL — THIS IS 80% OF THE AD)
As David Ogilvy said: "When you wrote your title, you spent 80% of your advertising dollar."

The reference ad's hook works because: ${hookAnalysis.whyItWorks}
Hook technique: ${hookAnalysis.hookTechnique}
Exact hook text: "${hookAnalysis.hookText}"
Visual hook: ${hookAnalysis.hookVisual}${hookAnalysis.videoFirstSeconds ? `\nFirst 3-5 seconds: ${hookAnalysis.videoFirstSeconds}` : ""}

Your ad's hook MUST:
1. Use the SAME technique (${hookAnalysis.hookTechnique}) — adapt it for ${product?.name || brand.name}
2. Match the intensity and specificity of the original — be equally punchy and specific
3. Don't copy word-for-word — replicate the psychological mechanism that makes it stop the scroll
`
    : "";

  const videoInstructions = isVideo ? `
## AD FORMAT: VIDEO
The competitor ad is a VIDEO ad. You must create a VIDEO CONCEPT, not a static image ad.

Generate a video script that replicates the competitor's video approach:
- If it's a talking-head / UGC testimonial → write a script for a person speaking to camera
- If it's a product demo → write a scene-by-scene product showcase script
- If it's a lifestyle montage → describe each scene/shot
- If it's a before/after → write the transformation sequence
- If it's text-on-screen with music → write each text card in sequence

The "videoScript" field must contain:
- Scene-by-scene breakdown (SCENE 1, SCENE 2, etc.)
- What's shown visually in each scene
- Any on-screen text or captions
- Voiceover or spoken dialogue (if applicable)
- Suggested music/mood
- Recommended duration per scene and total length

The "imagePrompt" field should describe ONE KEY FRAME from the video — the most compelling visual moment (usually the hook in the first 1-3 seconds). This will be generated as a preview thumbnail.
` : `
## AD FORMAT: STATIC IMAGE
The competitor ad is a STATIC IMAGE ad. Create a static ad concept.

## IMAGE PROMPT RULES (CRITICAL)
Most high-performing social media ads are NOT just product photos — they are designed graphics with TEXT BAKED INTO THE IMAGE. Your imagePrompt must replicate the competitor ad's visual approach holistically:

- If the competitor ad has a bold headline/claim on the image → include the EXACT text to render (adapted for ${brand.name})
- If it has a price callout, discount badge, or "FREE" banner → include equivalent text for the product
- If it has a before/after layout, comparison, or infographic style → describe that layout
- If it has testimonial text overlaid → write a testimonial quote for ${brand.name} to overlay
- If it has minimal text and is more lifestyle/product photography → describe that instead

The imagePrompt MUST specify:
1. LAYOUT — where text goes (top, center, bottom, banner bar, corner badge, etc.)
2. TYPOGRAPHY — style of text (bold sans-serif, handwritten, all-caps, etc.)
3. EXACT TEXT CONTENT — the actual words to render on the image (headline, price, CTA, etc.)
4. BACKGROUND — what's behind the text (product photo, gradient, lifestyle scene, solid color)
5. COLOR SCHEME — use brand colors (${brandColors})
6. OVERALL MOOD — professional, playful, urgent, premium, etc.
`;

  const videoJsonFields = isVideo ? `
  "videoScript": "Scene-by-scene video script. SCENE 1: [visual] [text/voiceover] [duration]. SCENE 2: ... Include music direction and total duration.",
  "adType": "video",` : `
  "adType": "static",`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `You are a senior Meta Ads creative director. Create a ${brand.name} ad for the specific product below, using the strategy of a proven competitor ad as inspiration.
${feedbackBlock}${hookBlock}
## PRODUCT TO FEATURE (THIS IS WHAT THE AD IS ABOUT)
${productInfo}

CRITICAL: The ad MUST be about THIS specific product. Every claim, benefit, ingredient, and feature you mention must be true for THIS product — NOT the competitor's product. If the competitor ad talks about ingredients or benefits that don't apply to this product, replace them with real benefits of THIS product.

## BRAND
- Name: ${brand.name}
- Style: ${brandStyle}
- Colors: ${brandColors}
- Description: ${brand.description}
- Tagline: ${brandTagline}

## COMPETITOR AD (STRATEGY REFERENCE ONLY)
This ad ran for ${referenceAd.daysRunning} days — longer-running ads are more profitable. Replicate the STRATEGY (hook type, copy structure, emotional angle, offer structure, visual approach) but write about ${product?.name || brand.name}, NOT about ${referenceAd.advertiser}'s product.

Advertiser: ${referenceAd.advertiser}
Primary Text: """
${referenceAd.primaryText}
"""
Headline: ${referenceAd.headline || "(none)"}
Description: ${referenceAd.description || "(none)"}
CTA: ${referenceAd.ctaText || "Shop Now"}
Platforms: ${referenceAd.platforms}
Format: ${isVideo ? "VIDEO AD" : "STATIC IMAGE AD"}
${videoInstructions}
## REPLICATION INSTRUCTIONS
Replicate ONLY the structural strategy from the competitor — adapt it for ${product?.name || brand.name}:
1. HOOK TYPE — same opening strategy (question, bold claim, emoji attention-grab, social proof, etc.)
2. COPY STRUCTURE — same format (short/long, bullets, emojis, testimonial style, educational)
3. EMOTIONAL ANGLE — same emotion (FOMO, aspiration, trust, community, urgency, curiosity)
4. OFFER STRUCTURE — same type of offer (discount, free trial, gift, bundle, limited edition)
5. VISUAL APPROACH — replicate the creative format (${isVideo ? "video style, pacing, content type" : "image composition, text overlays, layout"})

DO NOT copy the competitor's specific product claims, ingredients, or benefits. Use the product information above.

## AD TACTICS KNOWLEDGE
${knowledgeTactics.slice(0, 1500)}

Return JSON only (no markdown, no backticks):
{
  "primaryText": "Main ad copy replicating the competitor's copy structure for ${brand.name}.",
  "headline": "Bold headline under 40 chars",
  "description": "Link description under 30 chars",
  "ctaText": "Standard CTA (Shop Now, Learn More, Get Offer, Sign Up)",
  "placements": ["Facebook Feed", "Instagram Feed"],
  "imagePrompt": "${isVideo ? "Describe the KEY FRAME / thumbnail — the most compelling visual moment from the video concept. This single image will be generated as the video preview." : "Full ad graphic composition including text overlays, layout, typography, exact text content, background, and color scheme."}",${videoJsonFields}
  "targetAudience": "Target audience description",
  "format": "${isVideo ? "video" : "feed post"}",
  "rationale": "Specifically explain: (1) what strategy you replicated from ${referenceAd.advertiser}'s ad, (2) why that strategy works (ran ${referenceAd.daysRunning} days), (3) how you adapted it for ${brand.name}'s ${product?.name || 'brand'}."
}`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";

  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    parsed = {
      primaryText: "",
      headline: "Generated Ad",
      description: "",
      ctaText: "Shop Now",
      placements: ["Facebook Feed", "Instagram Feed"],
      imagePrompt: "",
      targetAudience: "",
      format: isVideo ? "video" : "feed post",
      rationale: "",
      adType: isVideo ? "video" : "static",
      videoScript: "",
    };
  }

  const placements = Array.isArray(parsed.placements)
    ? parsed.placements.join(", ")
    : parsed.placements || "Facebook Feed, Instagram Feed";

  return {
    id: `concept-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    headline: parsed.headline || "",
    body: parsed.primaryText || "",
    description: parsed.description || "",
    ctaText: parsed.ctaText || "",
    imagePrompt: parsed.imagePrompt || "",
    generatedImageUrl: "",
    referenceImageUrl: referenceAd.imageUrl || "",
    targetAudience: parsed.targetAudience || "",
    format: parsed.format || (isVideo ? "video" : "feed post"),
    placements,
    rationale: parsed.rationale || "",
    productName: product?.name || "",
    inspirationAdIds: referenceAd.id,
    starred: false,
    createdAt: new Date().toISOString(),
    adType: isVideo ? "video" : "static",
    videoScript: parsed.videoScript || "",
  };
}

export interface BrandAnalysis {
  name: string;
  description: string;
  tagline: string;
  colors: string;
  style: string;
  voice: string;
}

export async function analyzeBrandIdentity(
  websiteContent: string,
  instagramBio: string,
  url: string
): Promise<BrandAnalysis> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze this brand's website content and produce a structured brand identity profile.

## Website URL
${url}

## Website Content
${websiteContent.slice(0, 8000)}

${instagramBio ? `## Instagram Bio\n${instagramBio}` : ""}

Return a JSON object with these fields (no markdown, just JSON):
{
  "name": "The brand name",
  "description": "2-3 sentence brand description covering what they do, who they serve, and their positioning",
  "tagline": "Their tagline or a concise brand promise",
  "colors": "Comma-separated list of brand colors (e.g., 'pink, purple, white')",
  "style": "Visual style description (e.g., 'vibrant, playful, lifestyle-focused')",
  "voice": "Brand voice description (e.g., 'energetic, empowering, casual')"
}`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch {
    return {
      name: new URL(url).hostname,
      description: "",
      tagline: "",
      colors: "",
      style: "",
      voice: "",
    };
  }
}

export async function extractProductsWithClaude(
  websiteContent: string,
  productImageMap: Record<string, string> = {}
): Promise<Product[]> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Extract all products from this website content. Return a JSON array of products.

## Website Content
${websiteContent.slice(0, 10000)}

Return a JSON array (no markdown, just JSON):
[
  {
    "name": "Product Name",
    "description": "Short product description",
    "price": "$XX.XX or empty string if unknown",
    "category": "Product category"
  }
]

If no products are found, return an empty array: []`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "[]";

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    const mapKeys = Object.keys(productImageMap);

    return (parsed as { name: string; description: string; price: string; category: string }[]).map(
      (p: { name: string; description: string; price: string; category: string }) => {
        const name = p.name || "";
        const nameLower = name.toLowerCase();
        let imageUrl = "";
        for (const key of mapKeys) {
          if (key.includes(nameLower) || nameLower.includes(key)) {
            imageUrl = productImageMap[key];
            break;
          }
        }
        if (!imageUrl) {
          for (const key of mapKeys) {
            const words = nameLower.split(/\s+/);
            if (words.some((w) => w.length > 3 && key.includes(w))) {
              imageUrl = productImageMap[key];
              break;
            }
          }
        }
        return {
          id: `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name,
          description: (p.description || "").slice(0, 200),
          price: p.price || "",
          imageUrl,
          category: p.category || "",
        };
      }
    );
  } catch {
    return [];
  }
}

export async function analyzeWinningPatterns(
  ads: MetaAdEntry[],
  brandContext: BrandContext,
): Promise<AnalysisResult> {
  const topAds = ads
    .sort((a, b) => b.daysRunning - a.daysRunning)
    .slice(0, 25);

  const adSummaries = topAds.map((ad) => {
    const format = ad.videoUrl ? "[VIDEO]" : "[STATIC]";
    return `${format} [ID: ${ad.id}] ${ad.advertiser} — ${ad.daysRunning} days, ${ad.isActive ? "ACTIVE" : "inactive"}
  Primary Text: ${(ad.primaryText || "").slice(0, 300)}
  Headline: ${ad.headline || "(none)"}
  CTA: ${ad.ctaText || "(none)"}`;
  }).join("\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: `You are an elite ad strategist obsessed with hooks. As David Ogilvy said: "When you wrote your title, you spent 80% of your advertising dollar." The HOOK is the most important element of any ad.

Analyze these ${topAds.length} competitor ads (sorted by longevity — longer running = more profitable).

## Brand Context
${brandContext.name}: ${brandContext.description}
Category: ${brandContext.category}

## Competitor Ads
${adSummaries}

You must return TWO things:

### 1. HOOK ANALYSIS (per-ad — the most important part)
For EVERY ad above, extract and analyze its hook. The hook is:
- For VIDEO ads [VIDEO]: what happens in the FIRST 3-5 SECONDS — what is said, what is shown, what text appears on screen, what is the visual vibe/energy
- For STATIC ads [STATIC]: the PUNCHIEST element that grabs attention — the bold headline text, the striking visual composition, the color contrast, the pattern interrupt

Be EXTREMELY SPECIFIC about each hook. Don't say "question hook" — say the EXACT words. Don't say "bold visual" — describe EXACTLY what the viewer sees.

### 2. WINNING PATTERNS (5-8 patterns across all ads)
Group ads into patterns and analyze what makes each pattern work.

IMPORTANT: Each ad is labeled with [ID: xxx]. Use the EXACT ad ID from the label in all references. Do NOT use index numbers.

Return JSON only (no markdown, no backticks):
{
  "hooks": [
    {
      "adId": "1234567890123456",
      "advertiser": "Brand Name",
      "hookText": "The EXACT opening words/sentence that grab attention. Quote it precisely.",
      "hookTechnique": "Be specific: 'provocative rhetorical question that challenges the common belief that X', 'shocking stat with visual proof', 'before/after contrast with dramatic transformation', 'social proof number (X thousand customers)', 'pattern interrupt with unexpected visual', 'direct address calling out a specific pain point', 'curiosity gap that withholds the answer'",
      "hookVisual": "Describe EXACTLY what the viewer sees: 'Bold white all-caps text on dark background reading [EXACT TEXT], product bottle in bottom-right corner, electric blue accent line' or 'Person speaking directly to camera, kitchen setting, holding product, subtitle text overlay in yellow'",
      "whyItWorks": "1-2 sentences on the psychology — what cognitive bias or emotional trigger this exploits to stop the scroll",
      "effectiveness": 8,
      "isVideo": false,
      "videoFirstSeconds": "Only for VIDEO ads: describe second-by-second what happens in the first 3-5 seconds. What is the visual? What is said/heard? What text appears? What is the energy/pacing?"
    }
  ],
  "patterns": [
    {
      "name": "Pattern name (e.g., 'Question Hook + Social Proof')",
      "frequency": 5,
      "avgDaysRunning": 45,
      "description": "What this pattern is and why it works",
      "hookAnalysis": "A detailed paragraph analyzing the hook strategies used in this pattern. What specific hook techniques appear? Why are these hooks effective for this category? What makes the top-performing hooks in this pattern stand out from weaker ones?",
      "examples": [
        { "advertiser": "Brand Name", "adId": "1234567890123456", "excerpt": "First line of the ad copy..." }
      ],
      "hookType": "question",
      "copyStructure": "short testimonial with emoji",
      "emotionalAngle": "social proof + FOMO",
      "offerType": "discount",
      "visualApproach": "text-on-image with bold headline"
    }
  ],
  "summary": "2-3 paragraph overview. Start with what hook strategies are winning in this niche and why. Then cover broader patterns."
}`,
      },
    ],
  });

  const block = message.content[0];
  const text = block.type === "text" ? block.text : "{}";

  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
  } catch (e) {
    console.error("Analysis JSON parse failed:", (e as Error).message);
    console.error("Response length:", text.length, "Stop reason:", message.stop_reason);
    console.error("First 500 chars:", text.slice(0, 500));
    parsed = { hooks: [], patterns: [], summary: "Analysis failed to parse." };
  }

  return {
    hooks: Array.isArray(parsed.hooks) ? parsed.hooks : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
    summary: parsed.summary || "",
    analyzedAt: new Date().toISOString(),
    totalAdsAnalyzed: topAds.length,
  };
}

export async function generateBeginnerTips(
  knowledgeTactics: string
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `You are a friendly ad mentor for beginners. Based on the expert knowledge below, create a beginner-friendly guide.

## Expert Knowledge
${knowledgeTactics.slice(0, 6000)}

Write the guide in markdown with these sections:

# What Makes a Good Ad
Simple explanation of hook, offer, and CTA basics.

# Common Mistakes to Avoid
Top 5-7 mistakes beginners make.

# Ad Formats Explained
Brief explanation of feed posts, stories, reels, and carousels.

# Budget Tips for Beginners
How to start with a small budget and scale.

# Testing & Iteration
How to A/B test and improve ads over time.

Keep it simple, actionable, and encouraging. Use short paragraphs and bullet points.`,
      },
    ],
  });

  const block = message.content[0];
  return block.type === "text" ? block.text : "";
}
