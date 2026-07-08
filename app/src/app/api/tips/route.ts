import { NextResponse } from "next/server";
import { readKnowledge, readKnowledgeMarkdown } from "@/lib/csv";
import { generateBeginnerTips } from "@/lib/claude";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "..", "data");
const TIPS_FILE = path.join(DATA_DIR, "tips.md");

export async function GET() {
  if (fs.existsSync(TIPS_FILE)) {
    const content = fs.readFileSync(TIPS_FILE, "utf-8");
    return NextResponse.json({ content });
  }
  return NextResponse.json({ content: "" });
}

export async function POST() {
  const knowledge = readKnowledge();
  const knowledgeTactics = knowledge
    .map((k) => {
      const markdown = readKnowledgeMarkdown(k.id);
      return markdown || k.tactics || k.summary;
    })
    .join("\n\n---\n\n")
    .slice(0, 8000);

  if (!knowledgeTactics.trim()) {
    return NextResponse.json(
      { error: "No knowledge base found. Run the pipeline first." },
      { status: 400 }
    );
  }

  const tips = await generateBeginnerTips(knowledgeTactics);

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TIPS_FILE, tips);

  return NextResponse.json({ content: tips });
}
