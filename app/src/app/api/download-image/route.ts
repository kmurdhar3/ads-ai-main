import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "ad-image.png";

  if (!url) {
    return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch image: ${res.status}`);
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("Image download failed:", e);
    return NextResponse.json({ error: "Failed to download image" }, { status: 500 });
  }
}
