import Anthropic from "@anthropic-ai/sdk";
import { AdConcept, BrandContext, MetaAdEntry, Product, QualityScore } from "./types";

const client = new Anthropic();

export async function evaluateCreative(
  concept: AdConcept,
  brandContext: BrandContext,
  referenceAd: MetaAdEntry,
  products?: Product[],
): Promise<QualityScore> {
  const productList = products && products.length > 0
    ? products.map((p) => `- ${p.name}: ${p.description}`).join("\n")
    : "Not provided";

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are a strict ad quality control reviewer. Evaluate this generated ad concept against the brand context and reference competitor ad.

## Brand Context
Name: ${brandContext.name}
Description: ${brandContext.description}
Style: ${brandContext.style || "not specified"}
Colors: ${brandContext.colors || "not specified"}

## Brand's Full Product Catalog
${productList}

The ad can be about ANY of these products. Do NOT flag a product as "wrong category" if it appears in the catalog above.

## Reference Competitor Ad (strategy reference)
Advertiser: ${referenceAd.advertiser}
Primary Text: ${(referenceAd.primaryText || "").slice(0, 200)}
Headline: ${referenceAd.headline}
Days Running: ${referenceAd.daysRunning}

## Generated Concept to Evaluate
Primary Text: ${concept.body}
Headline: ${concept.headline}
Description: ${concept.description}
CTA: ${concept.ctaText}
Image Prompt: ${concept.imagePrompt}
Product: ${concept.productName || "general brand"}

Score on 3 dimensions (1-10 each):

1. **Brand Consistency** (weight 40%): Does the tone match the brand voice? Is the product represented accurately? Is the ad about a real product from the catalog above (not the competitor's product)?
2. **Copy Quality** (weight 35%): Is the hook compelling? Is the copy grammatically correct and persuasive? Is the CTA appropriate? Professional, not generic filler?
3. **Strategic Relevance** (weight 25%): Does it replicate the competitor ad's winning strategy (hook type, copy structure, emotional angle)? Is the adaptation smart?

FAIL CONDITIONS (score the relevant dimension 1-3):
- The ad describes the COMPETITOR'S product instead of the assigned brand product
- The ad contains fabricated claims, ingredients, or benefits not true for the assigned product
- The copy is nonsensical or incoherent

Scoring guide:
- 1-3: Critical failure — wrong product, fabricated claims, nonsensical copy
- 4-5: Poor — generic filler, weak hook, doesn't match brand voice at all
- 6-7: Solid — on-brand, competent copy, adapts the strategy reasonably well
- 8-9: Strong — compelling hook, great brand match, smart strategic adaptation
- 10: Exceptional — could run as-is with no edits

Return JSON only (no markdown, no backticks):
{
  "brandConsistency": 8,
  "copyQuality": 7,
  "visualRelevance": 8,
  "feedback": "Specific feedback on what's strong and what's weak. Be concise."
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
      brandConsistency: 5,
      copyQuality: 5,
      visualRelevance: 5,
      feedback: "QC evaluation failed to parse.",
    };
  }

  const bc = Number(parsed.brandConsistency) || 5;
  const cq = Number(parsed.copyQuality) || 5;
  const vr = Number(parsed.visualRelevance) || 5;
  const overallScore = Math.round((bc * 0.4 + cq * 0.35 + vr * 0.25) * 10) / 10;

  return {
    conceptId: concept.id,
    brandConsistency: bc,
    copyQuality: cq,
    visualRelevance: vr,
    overallScore,
    passed: overallScore >= 6,
    feedback: parsed.feedback || "",
    evaluatedAt: new Date().toISOString(),
  };
}
