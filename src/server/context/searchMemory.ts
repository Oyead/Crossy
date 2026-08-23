import OpenAI from "openai";
import prisma from "@/server/db/prisma";
import type { MediaResult } from "../integrations/MediaSearchProvider";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const SIMILARITY_DISTANCE_THRESHOLD = 0.9;
const RECALL_LIMIT = 5;
const PERSIST_RESULT_LIMIT = 20;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 8000,
      maxRetries: 1,
    });
  }
  return openaiClient;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export async function embedText(text: string): Promise<number[] | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 2000),
      dimensions: EMBEDDING_DIMS,
    });
    return response.data?.[0]?.embedding ?? null;
  } catch (error) {
    console.error("[searchMemory] Embedding failed:", error);
    return null;
  }
}

function mediaRowToResult(m: {
  externalId: string;
  title: string;
  mediaType: string;
  sourceApi: string;
  posterUrl: string | null;
  metadata: unknown;
}): MediaResult {
  const md = (m.metadata ?? {}) as Record<string, unknown>;
  return {
    id: m.externalId,
    title: m.title,
    type: m.mediaType as MediaResult["type"],
    provider: m.sourceApi,
    coverImage: m.posterUrl ?? undefined,
    description: typeof md.overview === "string" ? md.overview : typeof md.description === "string" ? md.description : undefined,
    rating: typeof md.rating === "number" ? md.rating : undefined,
    releaseDate: typeof md.releaseDate === "string" ? md.releaseDate : undefined,
    genres: Array.isArray(md.genres) ? (md.genres as string[]) : undefined,
  };
}

export async function recallSimilarQueryMedia(
  query: string
): Promise<MediaResult[]> {
  try {
    const embedding = await embedText(query);
    if (!embedding) return [];

    const vectorLiteral = toVectorLiteral(embedding);
    const similar = await prisma.$queryRaw<Array<{ id: string; rawInput: string; distance: number }>>`
      SELECT id, "rawInput", embedding <=> ${vectorLiteral}::vector AS distance
      FROM "SearchQuery"
      WHERE embedding IS NOT NULL
        AND LOWER("rawInput") <> LOWER(${query})
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT ${RECALL_LIMIT}
    `;

    const relevantIds = similar
      .filter((row) => Number(row.distance) <= SIMILARITY_DISTANCE_THRESHOLD)
      .map((row) => row.id);
    if (relevantIds.length === 0) return [];

    const recs = await prisma.recommendation.findMany({
      where: { queryId: { in: relevantIds } },
      include: { media: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    });

    const seen = new Set<string>();
    const results: MediaResult[] = [];
    for (const rec of recs) {
      if (!rec.media) continue;
      const key = `${rec.media.sourceApi}:${rec.media.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(mediaRowToResult(rec.media));
    }

    if (results.length > 0) {
      console.log(`[searchMemory] Recalled ${results.length} items from ${relevantIds.length} similar past searches`);
    }
    return results.slice(0, 12);
  } catch (error) {
    console.error("[searchMemory] Recall failed:", error);
    return [];
  }
}

export function persistSearchMemoryAsync(
  query: string,
  results: Array<{
    id: string;
    title: string;
    type: string;
    provider: string;
    posterUrl?: string;
    reason?: string;
    confidence?: number;
    userId?: string | null;
  }>
): void {
  void persistSearchMemory(query, results).catch((error) =>
    console.error("[searchMemory] Persist failed:", error)
  );
}

async function persistSearchMemory(
  query: string,
  results: Parameters<typeof persistSearchMemoryAsync>[1]
): Promise<void> {
  const userId = results.find((r) => r.userId)?.userId ?? null;

  const searchQuery = await prisma.searchQuery.create({
    data: { rawInput: query, mode: "text", userId },
  });

  const embedding = await embedText(query);
  if (embedding && embedding.length === EMBEDDING_DIMS) {
    await prisma.$executeRaw`
      UPDATE "SearchQuery"
      SET embedding = ${toVectorLiteral(embedding)}::vector
      WHERE id = ${searchQuery.id}
    `;
  }

  const topResults = results.slice(0, PERSIST_RESULT_LIMIT);
  const recommendations: Array<{ queryId: string; mediaId: string; matchReason: string }> = [];

  for (const result of topResults) {
    try {
      const media = await prisma.media.upsert({
        where: {
          mediaType_externalId: {
            mediaType: result.type,
            externalId: result.id,
          },
        },
        update: {},
        create: {
          mediaType: result.type,
          externalId: result.id,
          title: result.title,
          posterUrl: result.posterUrl ?? null,
          sourceApi: result.provider,
          metadata: {},
        },
      });
      recommendations.push({
        queryId: searchQuery.id,
        mediaId: media.id,
        matchReason: [
          result.reason ?? "",
          typeof result.confidence === "number" ? `(confidence: ${result.confidence.toFixed(2)})` : "",
        ].join(" ").trim(),
      });
    } catch {
      continue;
    }
  }

  if (recommendations.length > 0) {
    await prisma.recommendation.createMany({
      data: recommendations,
      skipDuplicates: true,
    });
  }
}
