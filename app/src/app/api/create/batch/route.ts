import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { readBrandContext, readBrand, readProducts, readKnowledge, readMetaAds, readKnowledgeMarkdown, readAnalysis, writeConcepts } from "@/lib/csv";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getBrandContext, getMostRecentBrandId } from "@/lib/db/brand-context";
import { getProducts } from "@/lib/db/products";
import { getMetaAds } from "@/lib/db/meta-ads";
import { createServerClient } from "@supabase/ssr";
import { saveConcept } from "@/lib/db/concepts";
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

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const count: number = Math.min(Math.max(body.count || 10, 1), 30);
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

  const analysisResult = readAnalysis();
  const hookMap = new Map<string, HookAnalysis>();
  if (analysisResult?.hooks) {
    for (const hook of analysisResult.hooks) {
      hookMap.set(hook.adId, hook);
    }
  }

  const topAds = [...metaAds]
    .sort((a, b) => b.daysRunning - a.daysRunning)
    .slice(0, count * 2);

  // Dynamic pairing: distribute top ads across products
  const assignments: { ad: typeof topAds[0]; product: typeof products[0] | null }[] = [];

  if (products.length > 0) {
    for (let i = 0; i < count; i++) {
      const ad = topAds[i % topAds.length];
      const product = products[i % products.length];
      assignments.push({ ad, product });
    }
  } else {
    for (let i = 0; i < count; i++) {
      const ad = topAds[i % topAds.length];
      assignments.push({ ad, product: null });
    }
  }

  const encoder = new TextEncoder();
  const allConcepts: AdConcept[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream closed */ }
      }

      const PARALLEL = 3;
      const startTime = Date.now();

      send({ type: "start", total: assignments.length, parallel: PARALLEL });

      for (let i = 0; i < assignments.length; i += PARALLEL) {
        const batch = assignments.slice(i, i + PARALLEL);
        const batchEnd = Math.min(i + PARALLEL, assignments.length);
        const batchLabel = batch.length === 1
          ? `concept ${i + 1}`
          : `concepts ${i + 1}-${batchEnd}`;

        send({
          type: "progress",
          current: i + 1,
          total: assignments.length,
          batchSize: batch.length,
          message: `Generating ${batchLabel} of ${assignments.length} in parallel...`,
        });

        const results = await Promise.allSettled(
          batch.map(async (assignment, batchIdx) => {
            const idx = i + batchIdx;
            const { ad, product } = assignment;

            const adHook = hookMap.get(ad.id);

            let concept = await generateReplicaAdConcept(
              brand,
              product,
              ad,
              knowledgeTactics,
              undefined,
              adHook,
            );

            // Generate image — match aspect ratio to reference ad's image
            if (concept.imagePrompt) {
              try {
                const referenceUrls = ad.imageUrl ? [ad.imageUrl] : [];
                const aspectRatio = detectAspectRatio(ad);

                const imageUrl = await generateAdImage(concept.imagePrompt, referenceUrls, {
                  aspectRatio,
                });
                concept.generatedImageUrl = imageUrl;
              } catch (e) {
                console.error(`Image generation failed for concept ${idx + 1}:`, e);
              }
            }

            // Quality control
            if (brandContext) {
              try {
                const qc = await evaluateCreative(concept, brandContext, ad, products);
                concept.qualityScore = qc.overallScore;
                concept.qualityFeedback = qc.feedback;
                concept.qcPassed = qc.passed;

                if (!qc.passed) {
                  send({
                    type: "qc-retry",
                    index: idx,
                    score: qc.overallScore,
                    message: `Concept ${idx + 1} scored ${qc.overallScore}/10 — retrying...`,
                  });

                  const retried = await generateReplicaAdConcept(
                    brand,
                    product,
                    ad,
                    knowledgeTactics,
                    qc.feedback,
                    adHook,
                  );

                  if (retried.imagePrompt) {
                    try {
                      const referenceUrls = ad.imageUrl ? [ad.imageUrl] : [];
                      const retryAspectRatio = detectAspectRatio(ad);
                      const imageUrl = await generateAdImage(retried.imagePrompt, referenceUrls, {
                        aspectRatio: retryAspectRatio,
                      });
                      retried.generatedImageUrl = imageUrl;
                    } catch (e) {
                      console.error(`Retry image generation failed:`, e);
                    }
                  }

                  const retryQc = await evaluateCreative(retried, brandContext, ad, products);
                  retried.qualityScore = retryQc.overallScore;
                  retried.qualityFeedback = retryQc.feedback;
                  retried.qcPassed = retryQc.passed;

                  if (retryQc.overallScore > qc.overallScore) {
                    concept = retried;
                  }
                }
              } catch (e) {
                console.error(`QC failed for concept ${idx + 1}:`, e);
              }
            }

            send({
              type: "concept",
              index: idx,
              concept,
              qcPassed: concept.qcPassed,
              qcScore: concept.qualityScore,
            });
            return concept;
          })
        );

        for (const result of results) {
          if (result.status === "fulfilled") {
            allConcepts.push(result.value);
          } else {
            console.error("Concept generation failed:", result.reason);
          }
        }
      }

      // Persist concepts per-user when authenticated
      if (user) {
        try {
          // Bulk insert via server client for performance
          const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return req.cookies.getAll() }, setAll() {} } }
          );

          const rows = allConcepts.map((c) => ({
            user_id: user.id,
            headline: c.headline,
            body: c.body,
            description: c.description || "",
            cta_text: c.ctaText || "",
            image_prompt: c.imagePrompt || "",
            generated_image_url: c.generatedImageUrl || "",
            video_script: c.videoScript || "",
            ad_type: c.adType || "static",
            target_audience: c.targetAudience || "",
            format: c.format || "",
            placements: c.placements || "",
            rationale: c.rationale || "",
            product_name: c.productName || "",
            inspiration_ad_ids: c.inspirationAdIds || "",
            starred: c.starred || false,
            quality_score: c.qualityScore || null,
            quality_feedback: c.qualityFeedback || "",
            qc_passed: c.qcPassed !== false,
            created_at: c.createdAt || new Date().toISOString(),
          }));

          await supabase.from("concepts").insert(rows);
        } catch (e) {
          // fallback: save individually
          for (const c of allConcepts) {
            try { await saveConcept(user.id, brandId!, c); } catch {}
          }
        }
      } else {
        await writeConcepts(allConcepts);
      }
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      send({ type: "complete", total: allConcepts.length, elapsedSeconds: elapsed });
      controller.close();
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
