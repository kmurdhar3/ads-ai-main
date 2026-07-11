import { NextRequest, NextResponse } from "next/server";
import { readBrandContext, writeBrandContext, readProducts } from "@/lib/csv";
import { BrandContext } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getBrandContext, saveBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { getProducts } from "@/lib/db/products";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");

function clearDownstreamData() {
  const filesToRemove = [
    "search-results.json",
    "analysis.json",
    "meta-ads.csv",
    "concepts.csv",
  ];
  for (const f of filesToRemove) {
    const fp = path.join(DATA_DIR, f);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  const dirsToClean = ["competitor-ads", "generated-images"];
  for (const dir of dirsToClean) {
    const dp = path.join(DATA_DIR, dir);
    if (fs.existsSync(dp)) {
      fs.rmSync(dp, { recursive: true, force: true });
      fs.mkdirSync(dp, { recursive: true });
    }
  }
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    // Fallback to file system
    const brandContext = readBrandContext();
    const products = readProducts();
    let assets: string[] = [];
    const assetsDir = path.join(DATA_DIR, "brand-assets");
    if (fs.existsSync(assetsDir)) {
      assets = fs
        .readdirSync(assetsDir)
        .filter((f) => /^(web-|ig-|asset-).*\.(png|jpg|jpeg|webp|svg)$/i.test(f));
    }
    return NextResponse.json({ brandContext, products, assets });
  }

  // User-scoped data from Supabase
  const brandId = await getMostRecentBrandId(user.id);
  if (!brandId) {
    return NextResponse.json({ brandContext: null, products: [], assets: [] });
  }

  const brandContext = await getBrandContext(user.id, brandId);
  const products = await getProducts(user.id, brandId);

  // Assets still stored in file system (user-specific folder could be added later)
  let assets: string[] = [];
  const assetsDir = path.join(DATA_DIR, "brand-assets");
  if (fs.existsSync(assetsDir)) {
    assets = fs
      .readdirSync(assetsDir)
      .filter((f) => /^(web-|ig-|asset-).*\.(png|jpg|jpeg|webp|svg)$/i.test(f));
  }

  return NextResponse.json({ brandContext, products, assets });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const ctx: BrandContext = body;
  const user = await getAuthenticatedUser();

  if (!ctx.name) {
    return NextResponse.json({ error: "Brand name is required" }, { status: 400 });
  }

  if (!ctx.collectedAt) {
    ctx.collectedAt = new Date().toISOString();
  }
  if (!ctx.collectedBy) {
    ctx.collectedBy = "web-form";
  }
  if (!ctx.sources) {
    ctx.sources = [];
  }
  if (!ctx.keywords) {
    ctx.keywords = [];
  }

  if (!user) {
    // Fallback to file system
    const existing = readBrandContext();
    const brandChanged = !existing || existing.name !== ctx.name || existing.url !== ctx.url;
    await writeBrandContext(ctx);
    if (brandChanged) {
      clearDownstreamData();
    }
    return NextResponse.json({ success: true, brandContext: ctx, downstreamCleared: brandChanged });
  }

  // User-scoped save to Supabase
  const existingBrandId = await getMostRecentBrandId(user.id);
  let existing = null;
  if (existingBrandId) {
    existing = await getBrandContext(user.id, existingBrandId);
  }
  const brandChanged = !existing || existing.name !== ctx.name || existing.url !== ctx.url;

  const { brandId } = await saveBrandContext(user.id, ctx);

  // Clear downstream data is still file-based for now
  if (brandChanged) {
    clearDownstreamData();
  }

  return NextResponse.json({
    success: true,
    brandContext: ctx,
    brandId,
    downstreamCleared: brandChanged
  });
}
