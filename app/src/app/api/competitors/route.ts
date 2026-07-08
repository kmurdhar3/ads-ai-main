import { NextRequest, NextResponse } from "next/server";
import { readMetaAds } from "@/lib/csv";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getMetaAds } from "@/lib/db/meta-ads";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const advertiser = searchParams.get("advertiser");
  const type = searchParams.get("type");

  if (type === "meta-ads") {
    try {
      const user = await getAuthenticatedUser();
      if (user) {
        let metaAds = await getMetaAds(user.id);
        if (advertiser) metaAds = metaAds.filter((a) => a.advertiser === advertiser);
        return NextResponse.json(metaAds);
      }
    } catch (e) {
      // fallback
    }

    let metaAds = readMetaAds();
    if (advertiser) {
      metaAds = metaAds.filter((a) => a.advertiser === advertiser);
    }
    return NextResponse.json(metaAds);
  }

  // Legacy endpoint — return empty array (no more Perplexity strategy data)
  return NextResponse.json([]);
}
