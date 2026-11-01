import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { readBrandContext, readBrand, readProducts, readKnowledge, readMetaAds, readKnowledgeMarkdown, readAnalysis, writeConcepts } from "@/lib/csv";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { getProducts } from "@/lib/db/products";
import { getMetaAds } from "@/lib/db/meta-ads";
import { getLatestAnalysis } from "@/lib/db/analysis";
import { saveConcept, createConceptBatch, updateConceptBatchStats, getConceptsByBatch } from "@/lib/db/concepts";
import { generateReplicaAdConcept } from "@/lib/claude";
import { evaluateCreative } from "@/lib/quality-control";
import { generateAdImage } from "@/lib/kie-ai";
import { AdConcept, BrandContext, Brand, MetaAdEntry, HookAnalysis } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "..", "data");

function detectAspectRatio(ad: MetaAdEntry): "1:1" | "9:16" | "4:5" {
  if (!ad.localImagePath) return "1:1";
  const imgPath = path.join(DATA_DIR, ad.localImagePath);
  if (!fs.existsSync(imgPath)) return "1:1";

  try {
    const buf = fs.readFileSync(imgPath);
    const dims = getImageDimensions(buf);
    if (!dims) return "1:1";
    const ratio = dims.height / dims.width;
    if (ratio > 1.4) return "9:16";
    if (ratio > 1.1) return "4:5";
    return "1:1";
  } catch {
    return "1:1";
  }
}

function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: bytes 16-23 contain width and height as 4-byte big-endian
  if (buf[0] === 0x89 && buf[1] === 0x50) {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  }
  // JPEG: scan for SOF0/SOF2 markers
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marker = buf[i + 1];
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buf.readUInt16BE(i + 5);
        const width = buf.readUInt16BE(i + 7);
        return { width, height };
      }
      const segLen = buf.readUInt16BE(i + 2);
      i += 2 + segLen;
    }
  }
  // WebP: RIFF header, VP8 chunk
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[8] === 0x57 && buf[9] === 0x45) {
    if (buf[12] === 0x56 && buf[13] === 0x50 && buf[14] === 0x38 && buf[15] === 0x20) {
      const width = (buf.readUInt16LE(26) & 0x3FFF);
      const height = (buf.readUInt16LE(28) & 0x3FFF);
      return { width, height };
    }
  }
  return null;
}

// Supabase errors are plain objects ({ message, code }), not Error instances.
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  // Vercel stops a request after 300s, so the page asks for a few concepts per
  // request (count) and walks through the full run (totalCount) with offset.
  const count: number = Math.min(Math.max(body.count || 3, 1), 30);
  const totalCount: number = Math.min(Math.max(body.totalCount || count, count), 30);
  const offset: number = Math.max(body.offset || 0, 0);
  const existingBatchId: string | null = body.batchId || null;
  const productNames: string[] | undefined = body.productNames;

  const user = await getAuthenticatedUser();

  let brandContext = null;
  let legacyBrand = null;
  let brandId: string | null = null;
  if (user) {
    brandId = await getMostRecentBrandId(user.id);
    if (!brandId) {
      return new Response(JSON.stringify({ error: "No brand profile found" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    brandContext = await getBrandContext(user.id, brandId);
  } else {
    legacyBrand = readBrand();
    brandContext = readBrandContext();
  }

  const brand: BrandContext | Brand | null = brandContext || legacyBrand;

  if (!brand) {
    return new Response(JSON.stringify({ error: "No brand profile found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  let products = [];
  if (user && brandId) {
    products = await getProducts(user.id, brandId);
  } else {
    products = readProducts();
  }
  if (productNames && productNames.length > 0) {
    const nameSet = new Set(productNames.map((n) => n.toLowerCase()));
    products = products.filter((p) => nameSet.has(p.name.toLowerCase()));
  }

  const knowledge = readKnowledge();
  let metaAds = [];
  if (user && brandId) {
    metaAds = await getMetaAds(user.id, brandId);
  } else {
    metaAds = readMetaAds();
  }

  if (metaAds.length === 0) {
    return new Response(JSON.stringify({ error: "No competitor ads found. Search first." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const knowledgeTactics = knowledge
    .map((k) => {
      const markdown = readKnowledgeMarkdown(k.id);
      return markdown || k.tactics || k.summary;
    })
    .join("\n\n---\n\n")
    .slice(0, 8000);

  const analysisResult = user && brandId ? await getLatestAnalysis(user.id, brandId) : readAnalysis();
  const hookMap = new Map<string, HookAnalysis>();
  if (analysisResult?.hooks) {
    for (const hook of analysisResult.hooks) {
      hookMap.set(hook.adId, hook);
    }
  }

  const topAds = [...metaAds]
    .sort((a, b) => b.daysRunning - a.daysRunning)
    .slice(0, totalCount * 2);

  // Dynamic pairing: distribute top ads across products. Index from `offset`
  // so each request continues where the previous one stopped.
  const assignments: { index: number; ad: typeof topAds[0]; product: typeof products[0] | null }[] = [];
  for (let i = offset; i < Math.min(offset + count, totalCount); i++) {
    assignments.push({
      index: i,
      ad: topAds[i % topAds.length],
      product: products.length > 0 ? products[i % products.length] : null,
    });
  }

  const encoder = new TextEncoder();

  // Create the batch record on the first request only; later requests reuse it.
  let batchId: string | null = existingBatchId;
  if (user && brandId && !batchId) {
    try {
      batchId = await createConceptBatch(user.id, brandId, products.map((p) => p.name), totalCount);
    } catch (e) {
      console.error("Failed to create batch:", e);
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream closed */ }
      }

      const startTime = Date.now();
      const elapsedMs = () => Date.now() - startTime;
      // Keep the whole request under Vercel's 300s limit.
      const BUDGET_MS = 270_000;

      // Generation goes quiet for minutes (Claude + Kie.ai polling); a heartbeat
      // every 10s keeps the connection from being dropped.
      const heartbeat = setInterval(() => {
        send({ type: "heartbeat", elapsedSeconds: Math.round(elapsedMs() / 1000) });
      }, 10_000);

      const errors: string[] = [];
      let savedCount = 0;

      send({ type: "start", total: totalCount, offset, batchId });
      send({
        type: "progress",
        current: offset + 1,
        total: totalCount,
        message: `Generating concepts ${offset + 1}-${offset + assignments.length} of ${totalCount}...`,
      });

      async function makeImage(prompt: string, ad: MetaAdEntry): Promise<string> {
        // Leave ~40s for QC and saving after the image.
        const maxWaitMs = Math.max(30_000, BUDGET_MS - elapsedMs() - 40_000);
        try {
          return await generateAdImage(prompt, ad.imageUrl ? [ad.imageUrl] : [], {
            aspectRatio: detectAspectRatio(ad),
            maxWaitMs,
          });
        } catch (e) {
          const msg = errorMessage(e);
          console.error("Image generation failed:", e);
          errors.push(`Image: ${msg}`);
          return "";
        }
      }

      try {
        await Promise.allSettled(
          assignments.map(async ({ index: idx, ad, product }) => {
            try {
              const adHook = hookMap.get(ad.id);

              let concept = await generateReplicaAdConcept(brand, product, ad, knowledgeTactics, undefined, adHook);
              if (concept.imagePrompt) {
                concept.generatedImageUrl = await makeImage(concept.imagePrompt, ad);
              }

              // Quality control (one retry, only if there is time left for it)
              if (brandContext) {
                try {
                  const qc = await evaluateCreative(concept, brandContext, ad, products);
                  concept.qualityScore = qc.overallScore;
                  concept.qualityFeedback = qc.feedback;
                  concept.qcPassed = qc.passed;

                  if (!qc.passed && elapsedMs() < 90_000) {
                    send({
                      type: "qc-retry",
                      index: idx,
                      score: qc.overallScore,
                      message: `Concept ${idx + 1} scored ${qc.overallScore}/10 — retrying...`,
                    });

                    const retried = await generateReplicaAdConcept(brand, product, ad, knowledgeTactics, qc.feedback, adHook);
                    if (retried.imagePrompt) {
                      retried.generatedImageUrl = await makeImage(retried.imagePrompt, ad);
                    }
                    const retryQc = await evaluateCreative(retried, brandContext, ad, products);
                    retried.qualityScore = retryQc.overallScore;
                    retried.qualityFeedback = retryQc.feedback;
                    retried.qcPassed = retryQc.passed;
                    if (retryQc.overallScore > qc.overallScore) concept = retried;
                  }
                } catch (e) {
                  console.error(`QC failed for concept ${idx + 1}:`, e);
                }
              }

              // Save right away so finished work survives even if the request is cut off.
              if (user && brandId) {
                await saveConcept(user.id, brandId, concept, batchId || undefined);
                savedCount++;
              }

              send({ type: "concept", index: idx, concept, qcPassed: concept.qcPassed, qcScore: concept.qualityScore });
              return concept;
            } catch (e) {
              const msg = errorMessage(e);
              console.error(`Concept ${idx + 1} failed:`, e);
              errors.push(`Concept ${idx + 1}: ${msg}`);
              send({ type: "concept-error", index: idx, message: `Concept ${idx + 1} failed: ${msg}` });
              throw e;
            }
          })
        ).then(async (results) => {
          if (!user) {
            const done = results
              .filter((r): r is PromiseFulfilledResult<AdConcept> => r.status === "fulfilled")
              .map((r) => r.value);
            await writeConcepts(done);
          }
        });

        // Batch stats: count all passing concepts saved so far for this batch
        if (batchId && user) {
          try {
            const batchConcepts = await getConceptsByBatch(user.id, batchId);
            await updateConceptBatchStats(batchId, batchConcepts.filter((c) => c.qcPassed !== false).length);
          } catch (e) {
            console.error("Failed to update batch stats:", e);
          }
        }
      } finally {
        clearInterval(heartbeat);
        send({
          type: "chunk-complete",
          batchId,
          offset,
          generated: assignments.length,
          saved: savedCount,
          errors,
          elapsedSeconds: Math.round(elapsedMs() / 1000),
        });
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
