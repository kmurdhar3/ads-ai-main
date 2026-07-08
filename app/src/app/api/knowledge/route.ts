import { NextRequest, NextResponse } from "next/server";
import { readKnowledge, readKnowledgeMarkdown } from "@/lib/csv";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    const content = readKnowledgeMarkdown(id);
    return NextResponse.json({ id, content });
  }

  const entries = readKnowledge();
  return NextResponse.json(entries);
}
