import prisma from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import {
  EMBEDDING_DIMS,
  embedText,
  toVectorLiteral,
} from "./embed";
import { ensureMediaEmbedding, mediaRowToResult } from "./itemVectors";
import { normalizeGenres } from "../integrations/tagMap";
import type { MediaResult } from "../integrations/MediaSearchProvider";

const SIMILARITY_DISTANCE_THRESHOLD = 0.9;
const RECALL_LIMIT = 5;
const PERSIST_RESULT_LIMIT = 20;

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

export interface PersistableResult {
  id: string;
  title: string;
  type: string;
  provider: string;
  posterUrl?: string;
  description?: string;
  genres?: string[];
  creators?: string[];
  rating?: number;
  releaseDate?: string;
  reason?: string;
  confidence?: number;
  userId?: string | null;
}

export function buildMediaMetadata(result: PersistableResult): Prisma.InputJsonObject {
  const md: Record<string, unknown> = {
    overview: result.description,
    rating: typeof result.rating === "number" ? result.rating : undefined,
    releaseDate: result.releaseDate,
    genres: normalizeGenres(result.genres) ?? result.genres?.filter((g) => typeof g === "string"),
    creators: result.creators?.filter((c) => typeof c === "string"),
  };
  return JSON.parse(JSON.stringify(md)) as Prisma.InputJsonObject;
}

export async function persistSearchMemoryAsync(
  query: string,
  results: PersistableResult[]
): Promise<void> {
  void persistSearchMemory(query, results).catch((error) =>
    console.error("[searchMemory] Persist failed:", error)
  );
}

async function persistSearchMemory(
  query: string,
  results: PersistableResult[]
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
          metadata: buildMediaMetadata(result),
        },
      });

      // Backfill metadata for rows persisted before enrichment existed.
      const md = (media.metadata ?? {}) as Record<string, unknown>;
      if (Object.keys(md).length === 0) {
        await prisma.media
          .update({
            where: { id: media.id },
            data: { metadata: buildMediaMetadata(result) },
          })
          .catch(() => undefined);
      }

      // Item-side embedding: puts this row into the shared vector space.
      void ensureMediaEmbedding({
        id: media.id,
        title: media.title,
        mediaType: media.mediaType,
        metadata:
          Object.keys(md).length > 0
            ? md
            : buildMediaMetadata(result),
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
