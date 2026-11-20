import prisma from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import {
  EMBEDDING_DIMS,
  embedText,
  toVectorLiteral,
} from "./embed";
import { ensureMediaEmbedding, mediaRowToResult } from "./itemVectors";
import { hasEmbeddedQueries } from "./embeddingAvailability";
import { normalizeGenres } from "../integrations/tagMap";
import type { MediaResult } from "../integrations/MediaSearchProvider";

const SIMILARITY_DISTANCE_THRESHOLD = 0.9;
const RECALL_LIMIT = 5;
const PERSIST_RESULT_LIMIT = 20;

export async function recallSimilarQueryMedia(
  query: string
): Promise<MediaResult[]> {
  try {
    if (!(await hasEmbeddedQueries())) return [];
    const embedding = await embedText(query, "query");
    if (!embedding) return [];

    const vectorLiteral = toVectorLiteral(embedding);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        externalId: string;
        title: string;
        mediaType: string;
        sourceApi: string;
        posterUrl: string | null;
        metadata: unknown;
        distance: number;
      }>
    >`
      WITH similar AS (
        SELECT id, embedding <=> ${vectorLiteral}::vector AS distance
        FROM "SearchQuery"
        WHERE embedding IS NOT NULL
          AND LOWER("rawInput") <> LOWER(${query})
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${RECALL_LIMIT}
      )
      SELECT
        m.id,
        m."externalId",
        m.title,
        m."mediaType",
        m."sourceApi",
        m."posterUrl",
        m.metadata,
        similar.distance
      FROM similar
      JOIN "Recommendation" r ON r."queryId" = similar.id
      JOIN "Media" m ON m.id = r."mediaId"
      WHERE similar.distance <= ${SIMILARITY_DISTANCE_THRESHOLD}
      ORDER BY similar.distance ASC, r."createdAt" DESC
      LIMIT 40
    `;

    const seen = new Set<string>();
    const results: MediaResult[] = [];
    for (const row of rows) {
      const key = `${row.sourceApi}:${row.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(mediaRowToResult(row));
    }

    if (results.length > 0) {
      console.log(`[searchMemory] Recalled ${results.length} items from similar past searches`);
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

  const embedding = await embedText(query, "query");
  if (embedding && embedding.length === EMBEDDING_DIMS) {
    await prisma.$executeRaw`
      UPDATE "SearchQuery"
      SET embedding = ${toVectorLiteral(embedding)}::vector
      WHERE id = ${searchQuery.id}
    `;
  }

  const topResults = results.slice(0, PERSIST_RESULT_LIMIT);
  const keys = topResults.map((r) => ({
    mediaType: r.type,
    externalId: r.id,
  }));
  const mediaSelect = {
    id: true,
    title: true,
    mediaType: true,
    externalId: true,
    metadata: true,
  } as const;

  const existing = await prisma.media.findMany({
    where: { OR: keys },
    select: mediaSelect,
  });
  const existingKeys = new Set(
    existing.map((m) => `${m.mediaType}:${m.externalId}`)
  );

  const missing = topResults.filter(
    (r) => !existingKeys.has(`${r.type}:${r.id}`)
  );
  if (missing.length > 0) {
    await prisma.media.createMany({
      data: missing.map((r) => ({
        mediaType: r.type,
        externalId: r.id,
        title: r.title,
        posterUrl: r.posterUrl ?? null,
        sourceApi: r.provider,
        metadata: buildMediaMetadata(r),
      })),
      skipDuplicates: true,
    });
  }

  const allMedia = await prisma.media.findMany({
    where: { OR: keys },
    select: mediaSelect,
  });
  const mediaByKey = new Map(
    allMedia.map((m) => [`${m.mediaType}:${m.externalId}`, m])
  );

  const recommendations: Array<{ queryId: string; mediaId: string; matchReason: string }> = [];
  const metadataUpdates: Array<{ id: string; metadata: Prisma.InputJsonObject }> = [];

  for (const result of topResults) {
    const media = mediaByKey.get(`${result.type}:${result.id}`);
    if (!media) continue;

    const md = (media.metadata ?? {}) as Record<string, unknown>;
    const metadata = Object.keys(md).length > 0 ? md : buildMediaMetadata(result);
    if (Object.keys(md).length === 0) {
      metadataUpdates.push({
        id: media.id,
        metadata: buildMediaMetadata(result),
      });
    }

    void ensureMediaEmbedding({
      id: media.id,
      title: media.title,
      mediaType: media.mediaType,
      metadata,
    });

    recommendations.push({
      queryId: searchQuery.id,
      mediaId: media.id,
      matchReason: [
        result.reason ?? "",
        typeof result.confidence === "number" ? `(confidence: ${result.confidence.toFixed(2)})` : "",
      ].join(" ").trim(),
    });
  }

  if (metadataUpdates.length > 0) {
    await Promise.all(
      metadataUpdates.map((update) =>
        prisma.media
          .update({
            where: { id: update.id },
            data: { metadata: update.metadata },
          })
          .catch(() => undefined)
      )
    );
  }

  if (recommendations.length > 0) {
    await prisma.recommendation.createMany({
      data: recommendations,
      skipDuplicates: true,
    });
  }
}
