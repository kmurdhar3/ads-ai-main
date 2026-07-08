import { NextRequest, NextResponse } from "next/server";
import { readMetaAds } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const advertiser = searchParams.get("advertiser");
  const type = searchParams.get("type");

  if (type === "meta-ads") {
    let metaAds = readMetaAds();
    if (advertiser) {
      metaAds = metaAds.filter((a) => a.advertiser === advertiser);
    }
    return NextResponse.json(metaAds);
  }

  // Legacy endpoint — return empty array (no more Perplexity strategy data)
  return NextResponse.json([]);
}
