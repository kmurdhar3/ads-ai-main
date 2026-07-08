import { NextResponse } from "next/server";
import { readBrandContext, readBrand, readConcepts, readKnowledge, readMetaAds, readSearchState, readAnalysis } from "@/lib/csv";

export async function GET() {
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
