import { NextResponse } from "next/server";
import { readBrandContext, readBrand, readConcepts, readKnowledge, readMetaAds, readSearchState, readAnalysis } from "@/lib/csv";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { getConcepts } from "@/lib/db/concepts";
import { getMetaAds } from "@/lib/db/meta-ads";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (user) {
      const brandId = await getMostRecentBrandId(user.id);
      if (!brandId) {
        return NextResponse.json({
          hasBrand: false,
          hasSearch: false,
          hasAnalysis: false,
          competitorCount: 0,
          metaAdCount: 0,
          conceptCount: 0,
          knowledgeCount: 0,
        });
      }

      const [brandContext, concepts, metaAds] = await Promise.all([
        getBrandContext(user.id, brandId),
        getConcepts(user.id, brandId),
        getMetaAds(user.id, brandId),
      ]);

      return NextResponse.json({
        hasBrand: !!brandContext,
        hasSearch: metaAds && metaAds.length > 0,
        hasAnalysis: false,
        competitorCount: (metaAds && metaAds.length) || 0,
        metaAdCount: (metaAds && metaAds.length) || 0,
        conceptCount: (concepts && concepts.length) || 0,
        knowledgeCount: 0,
      });
    }
  } catch (e) {
    // fallback to file-based diagnostics
  }

  const brandContext = readBrandContext();
  const legacyBrand = readBrand();
  const concepts = readConcepts();
  const knowledge = readKnowledge();
  const metaAds = readMetaAds();
  const searchState = readSearchState();
  const analysis = readAnalysis();

  return NextResponse.json({
    hasBrand: !!(brandContext || legacyBrand),
    hasSearch: !!(searchState && searchState.advertisers && searchState.advertisers.length > 0),
    hasAnalysis: !!(analysis && analysis.patterns && analysis.patterns.length > 0),
    competitorCount: searchState?.advertisers?.length || 0,
    metaAdCount: metaAds.length,
    conceptCount: concepts.length,
    knowledgeCount: knowledge.length,
  });
}
