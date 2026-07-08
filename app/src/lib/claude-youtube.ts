import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function analyzeYouTubeContent(
  channelName: string,
  videos: Array<{ title: string; transcript: string; viewCount: number }>
): Promise<{
  brandThemes: string[];
  tone: string;
  messaging: string;
  targetAudience: string;
  contentStyle: string;
  keyTopics: string[];
}> {
  const videoSummaries = videos
    .slice(0, 3)
    .map(
      (v, i) =>
        `Video ${i + 1}: "${v.title}" (${v.viewCount.toLocaleString()} views)\n` +
        `Transcript excerpt:\n${v.transcript.slice(0, 2000)}...`
    )
    .join("\n\n---\n\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `You are a brand strategist analyzing a YouTube channel to extract brand identity and messaging.

Channel: ${channelName}

Recent video transcripts:
${videoSummaries}

Analyze these videos and extract:

1. **Brand Themes** - What are the 3-5 main themes this brand focuses on? (e.g., "productivity", "wellness", "entrepreneurship")
2. **Tone** - How does the brand communicate? (e.g., "professional and authoritative", "casual and friendly", "inspirational")
3. **Messaging** - What's the core message or value proposition?
4. **Target Audience** - Who are they speaking to?
5. **Content Style** - Visual and narrative style patterns
6. **Key Topics** - Specific recurring topics or product categories mentioned

Return your analysis as a JSON object with these exact keys:
{
  "brandThemes": ["theme1", "theme2", ...],
  "tone": "description",
  "messaging": "core message",
  "targetAudience": "audience description",
  "contentStyle": "style description",
  "keyTopics": ["topic1", "topic2", ...]
}`,
      },
    ],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    return {
      brandThemes: [],
      tone: "",
      messaging: "",
      targetAudience: "",
      contentStyle: "",
      keyTopics: [],
    };
  }

  try {
    // Extract JSON from the response
    const jsonMatch = block.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback if JSON parsing fails
  }

  return {
    brandThemes: [],
    tone: "",
    messaging: "",
    targetAudience: "",
    contentStyle: "",
    keyTopics: [],
  };
}
