import { createRouteClient } from "@/lib/supabase/route";

const KIE_AI_API_KEY = process.env.KIE_AI_API_KEY || "";
const BASE_URL = "https://api.kie.ai/api/v1/jobs";

export async function generateAdImage(
  prompt: string,
  referenceImageUrls: string[] = [],
  options: { aspectRatio?: string } = {}
): Promise<string> {
  const createRes = await fetch(`${BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KIE_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "nano-banana-pro",
      input: {
        prompt,
        image_input: referenceImageUrls.slice(0, 8),
        aspect_ratio: options.aspectRatio || "1:1",
        output_format: "png",
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Kie.ai create task failed: ${createRes.status}`);
  }

  const createData = await createRes.json();

  // Handle "insufficient credits" error
  if (createData.code === 402) {
    throw new Error(`Kie.ai credits insufficient: ${createData.msg}`);
  }

  const taskId = createData.data?.taskId || createData.taskId;
  if (!taskId) {
    console.error('Kie.ai response:', JSON.stringify(createData));
    throw new Error("Kie.ai returned no taskId");
  }

  console.log(`[Kie.ai] Task created: ${taskId}`);

  // Increase timeout: 80 iterations × 3s = 4 minutes
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const statusRes = await fetch(
      `${BASE_URL}/recordInfo?taskId=${taskId}`,
      { headers: { Authorization: `Bearer ${KIE_AI_API_KEY}` } }
    );

    const result = await statusRes.json();
    const state = result.data?.state;

    if (i % 10 === 0) {
      console.log(`[Kie.ai] Poll ${i}/80 - State: ${state || 'unknown'}`);
    }

    if (state === "success") {
      const resultJson = JSON.parse(result.data.resultJson || "{}");
      const imageUrl = resultJson.resultUrls?.[0];
      if (!imageUrl) throw new Error("No image URL in result");
      console.log(`[Kie.ai] Image generated successfully`);
      const savedPath = await downloadGeneratedImage(imageUrl, taskId);
      return savedPath || imageUrl;
    }

    if (state === "failed") {
      throw new Error(`Image generation failed: ${result.data?.failMsg || "unknown"}`);
    }
  }

  throw new Error("Image generation timed out after 4 minutes");
}

async function downloadGeneratedImage(
  url: string,
  taskId: string
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());

    // Upload to Supabase Storage instead of local filesystem
    const supabase = await createRouteClient();
    const filename = `${taskId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("generated-images")
      .upload(filename, buffer, {
        contentType: "image/png",
        upsert: true
      });

    if (uploadError) {
      console.error("Failed to upload to Supabase Storage:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("generated-images")
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (e) {
    console.error("Error in downloadGeneratedImage:", e);
    return null;
  }
}
