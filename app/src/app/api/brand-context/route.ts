import { NextRequest, NextResponse } from "next/server";
import { readBrandContext, writeBrandContext, readProducts } from "@/lib/csv";
import { BrandContext } from "@/lib/types";
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

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const ctx: BrandContext = body;

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

  const existing = readBrandContext();
  const brandChanged = !existing || existing.name !== ctx.name || existing.url !== ctx.url;

  await writeBrandContext(ctx);

  if (brandChanged) {
    clearDownstreamData();
  }

  return NextResponse.json({ success: true, brandContext: ctx, downstreamCleared: brandChanged });
}
