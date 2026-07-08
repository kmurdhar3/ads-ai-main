import { NextResponse } from "next/server";
import { readAnalysis, writeAnalysis, readMetaAds, readBrandContext } from "@/lib/csv";
import { analyzeWinningPatterns } from "@/lib/claude";

export const maxDuration = 120;

export async function GET() {
  const analysis = readAnalysis();
  return NextResponse.json(analysis);
}

export async function POST() {
  const brandContext = readBrandContext();
  if (!brandContext) {
    return NextResponse.json({ error: "No brand context found" }, { status: 400 });
  }

  const metaAds = readMetaAds();
  if (metaAds.length === 0) {
    return NextResponse.json({ error: "No competitor ads found. Search first." }, { status: 400 });
  }

  const analysis = await analyzeWinningPatterns(metaAds, brandContext);
  await writeAnalysis(analysis);

  return NextResponse.json(analysis);
}
