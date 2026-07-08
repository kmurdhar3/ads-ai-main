import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imgPath = searchParams.get("path");
  const url = searchParams.get("url");

  if (imgPath) {
    const safePath = imgPath.replace(/\.\./g, "");
    const fullPath = path.join(DATA_DIR, safePath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".svg"
          ? "image/svg+xml"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";

    return new NextResponse(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
    });
  }

  if (url) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return new NextResponse(buffer, {
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
      });
    } catch {
      return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Missing path or url param" }, { status: 400 });
}
