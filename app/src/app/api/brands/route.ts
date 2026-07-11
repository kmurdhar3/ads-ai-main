import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { listBrandContexts } from "@/lib/db/brand-context";

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const brands = await listBrandContexts(user.id);
  return NextResponse.json(brands);
}
