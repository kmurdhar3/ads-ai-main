import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const config = {
    websiteUrl: body.websiteUrl || "",
    instagramHandle: body.instagramHandle || "",
    phases: body.phases || [],
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await runPipeline(config, (progress) => {
          const data = JSON.stringify(progress);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });
      } catch (e) {
        const errorData = JSON.stringify({
          phase: "error",
          step: "fatal",
          message: `Pipeline failed: ${e}`,
          progress: 0,
          errors: [`${e}`],
          log: [],
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
