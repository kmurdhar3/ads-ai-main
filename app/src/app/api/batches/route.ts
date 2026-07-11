import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getConceptBatches } from "@/lib/db/concepts";
import { getMostRecentBrandId } from "@/lib/db/brand-context";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json([]);
  }

  const brandId = await getMostRecentBrandId(user.id);
  if (!brandId) {
    return NextResponse.json([]);
  }

  const batches = await getConceptBatches(user.id, brandId);
  return NextResponse.json(batches);
}
