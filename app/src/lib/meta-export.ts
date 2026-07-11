/**
 * Meta Ads Manager bulk import utilities
 * Handles copy validation, CTA mapping, and export formatting
 */

export const META_LIMITS = {
  title: 40,
  body: 125,
  description: 30,
} as const;

export interface PreparedMetaCopy {
  title: string;
  titleTruncated: boolean;
  body: string;
  bodyTruncated: boolean;
  description: string;
  descriptionTruncated: boolean;
}

/**
 * Validate and prepare ad copy against Meta's character limits
 */
export function prepareForMeta(concept: {
  headline: string;
  body: string;
  description?: string;
  ctaText: string;
}): PreparedMetaCopy {
  return {
    title: concept.headline.slice(0, META_LIMITS.title),
    titleTruncated: concept.headline.length > META_LIMITS.title,
    body: concept.body.slice(0, META_LIMITS.body),
    bodyTruncated: concept.body.length > META_LIMITS.body,
    description: (concept.description || "").slice(0, META_LIMITS.description),
    descriptionTruncated: (concept.description || "").length > META_LIMITS.description,
  };
}

/**
 * Map free-form CTA text to Meta's required enum values
 * Returns tuple: [metaEnum, wasDefaulted]
 */
export function mapCtaToMetaEnum(ctaText: string): [string, boolean] {
  const t = ctaText.toLowerCase();

  if (t.includes("shop") || t.includes("buy")) return ["SHOP_NOW", false];
  if (t.includes("sign up") || t.includes("signup")) return ["SIGN_UP", false];
  if (t.includes("download")) return ["DOWNLOAD", false];
  if (t.includes("subscribe")) return ["SUBSCRIBE", false];
  if (t.includes("contact")) return ["CONTACT_US", false];
  if (t.includes("offer") || t.includes("deal")) return ["GET_OFFER", false];
  if (t.includes("learn")) return ["LEARN_MORE", false];

  // Default fallback
  return ["LEARN_MORE", true];
}
