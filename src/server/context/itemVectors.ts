import prisma from "@/server/db/prisma";
import { Prisma } from "@prisma/client";
import type { MediaResult } from "../integrations/MediaSearchProvider";
import {
  EMBEDDING_DIMS,
  embedText,
  parseVectorLiteral,
  toVectorLiteral,
} from "./embed";

const ITEM_RECALL_LIMIT = 8;
const ITEM_SIMILARITY_DISTANCE_THRESHOLD = 0.85;
const TASTE_FAVORITE_LIMIT = 50;
const BACKFILL_BATCH_SIZE = 10;
const BACKFILL_THROTTLE_MS = 5 * 60 * 1000;

const embeddingInFlight = new Set<string>();
let lastBackfillAt = 0;

export interface EmbeddedMediaRow {
  id: string;
  externalId: string;
  title: string;
  mediaType: string;
  sourceApi: string;
  posterUrl: string | null;
  metadata: unknown;
}

export function mediaRowToResult(m: EmbeddedMediaRow): MediaResult {
  const md = (m.metadata ?? {}) as Record<string, unknown>;
  return {
    id: m.externalId,
    title: m.title,
    type: m.mediaType as MediaResult["type"],
    provider: m.sourceApi,
    coverImage: m.posterUrl ?? undefined,
    description:
      typeof md.overview === "string"
        ? md.overview
        : typeof md.description === "string"
          ? md.description
          : undefined,
    rating: typeof md.rating === "number" ? md.rating : undefined,
    releaseDate: typeof md.releaseDate === "string" ? md.releaseDate : undefined,
    genres: Array.isArray(md.genres) ? (md.genres as string[]) : undefined,
  };
}

export function buildItemEmbeddingText(media: {
  title: string;
  mediaType: string;
  metadata?: unknown;
}): string {
  const md = (media.metadata ?? {}) as Record<string, unknown>;
  const overview =
    typeof md.overview === "string" && md.overview.trim()
      ? md.overview
      : typeof md.description === "string"
        ? md.description
        : "";
  const genres = Array.isArray(md.genres) ? md.genres.filter((g) => typeof g === "string") : [];
  const creators = Array.isArray(md.creators) ? md.creators.filter((c) => typeof c === "string") : [];
  return [
    media.title,
    media.mediaType !== "unknown" ? `(${media.mediaType})` : "",
    overview,
    genres.length > 0 ? `Genres: ${genres.join(", ")}` : "",
    creators.length > 0 ? `By ${creators.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join(". ")
    .replace(/\s+/g, " ")
    .trim();
}

async function hasEmbedding(mediaId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ ok: number }>>`
    SELECT 1 AS ok FROM "Media" WHERE id = ${mediaId} AND embedding IS NOT NULL LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Lazily embeds a Media row's description into pgvector so it becomes
 * searchable in the same space as user queries and taste vectors.
 * Safe to call repeatedly; concurrent calls for the same row are coalesced.
 */
export async function ensureMediaEmbedding(media: {
  id: string;
  title: string;
  mediaType: string;
  metadata?: unknown;
}): Promise<void> {
  if (!media?.id || embeddingInFlight.has(media.id)) return;
  embeddingInFlight.add(media.id);
  try {
    if (await hasEmbedding(media.id)) return;
    const text = buildItemEmbeddingText(media);
    if (!text) return;
    const embedding = await embedText(text);
    if (!embedding || embedding.length !== EMBEDDING_DIMS) return;
    await prisma.$executeRaw`
      UPDATE "Media"
      SET embedding = ${toVectorLiteral(embedding)}::vector
      WHERE id = ${media.id} AND embedding IS NULL
    `;
  } catch (error) {
    console.error("[itemVectors] ensureMediaEmbedding failed:", error);
  } finally {
    embeddingInFlight.delete(media.id);
  }
}

/**
 * Self-healing backfill: embeds older Media rows that were persisted before
 * embeddings existed, or that failed to embed transiently. Throttled.
 */
export function backfillUnembeddedMediaAsync(): void {
  const now = Date.now();
  if (now - lastBackfillAt < BACKFILL_THROTTLE_MS) return;
  lastBackfillAt = now;

  void (async () => {
    try {
      const rows = await prisma.$queryRaw<EmbeddedMediaRow[]>`
        SELECT id, "externalId", title, "mediaType", "sourceApi", "posterUrl", metadata
        FROM "Media"
        WHERE embedding IS NULL
        ORDER BY "updatedAt" DESC
        LIMIT ${BACKFILL_BATCH_SIZE}
      `;
      for (const row of rows) {
        await ensureMediaEmbedding(row);
      }
      if (rows.length > 0) {
        console.log(`[itemVectors] Backfilled ${rows.length} item embeddings`);
      }
    } catch (error) {
      console.error("[itemVectors] Backfill failed:", error);
    }
  })();
}

interface VectorRecallOptions {
  limit?: number;
  excludeKeys?: Set<string>;
  distanceThreshold?: number;
}

export async function recallItemsByVector(
  vectorLiteral: string,
  options: VectorRecallOptions = {}
): Promise<Array<{ result: MediaResult; distance: number }>> {
  const limit = options.limit ?? ITEM_RECALL_LIMIT;
  const threshold = options.distanceThreshold ?? ITEM_SIMILARITY_DISTANCE_THRESHOLD;
  const rows = await prisma.$queryRaw<
    Array<EmbeddedMediaRow & { distance: number }>
  >`
    SELECT id, "externalId", title, "mediaType", "sourceApi", "posterUrl", metadata,
           embedding <=> ${vectorLiteral}::vector AS distance
    FROM "Media"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${limit * 3}
  `;
  return rows
    .filter((row) => Number(row.distance) <= threshold)
    .filter(
      (row) =>
        !options.excludeKeys ||
        !options.excludeKeys.has(`${row.sourceApi}:${row.externalId}`)
    )
    .slice(0, limit)
    .map((row) => ({ result: mediaRowToResult(row), distance: Number(row.distance) }));
}

/** True cross-medium semantic search over item descriptions. */
export async function recallItemsByQuery(query: string): Promise<MediaResult[]> {
  try {
    const embedding = await embedText(query);
    if (!embedding || embedding.length !== EMBEDDING_DIMS) return [];
    const matches = await recallItemsByVector(toVectorLiteral(embedding));
    if (matches.length > 0) {
      console.log(`[itemVectors] Query recall hit ${matches.length} items by description similarity`);
    }
    return matches.map((m) => m.result);
  } catch (error) {
    console.error("[itemVectors] recallItemsByQuery failed:", error);
    return [];
  }
}

function meanVectors(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;
  const dims = vectors[0].length;
  const sum = new Array<number>(dims).fill(0);
  for (const v of vectors) {
    if (v.length !== dims) continue;
    for (let i = 0; i < dims; i++) sum[i] += v[i];
  }
  const n = vectors.length;
  return sum.map((s) => s / n);
}

export interface TasteProfile {
  tasteVector: number[] | null;
  favoriteTitles: string[];
  favoriteCount: number;
}

/**
 * The user profile from the recommendation essay:
 * the centroid of everything the user explicitly loved.
 */
export async function getTasteProfile(userId: string): Promise<TasteProfile> {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { media: true },
      take: TASTE_FAVORITE_LIMIT,
      orderBy: { createdAt: "desc" },
    });
    if (favorites.length === 0) {
      return { tasteVector: null, favoriteTitles: [], favoriteCount: 0 };
    }

    const vectors: number[][] = [];
    const titles: string[] = [];
    for (const fav of favorites) {
      if (fav.media?.title) titles.push(fav.media.title);
    }

    const mediaIds = favorites.map((f) => f.mediaId);
    const rows = await prisma.$queryRaw<Array<{ id: string; embedding: string }>>`
      SELECT id, embedding::text AS embedding
      FROM "Media"
      WHERE id IN (${Prisma.join(mediaIds)}) AND embedding IS NOT NULL
    `;
    for (const row of rows) {
      vectors.push(parseVectorLiteral(row.embedding));
    }

    return {
      tasteVector: meanVectors(vectors),
      favoriteTitles: titles.slice(0, 3),
      favoriteCount: favorites.length,
    };
  } catch (error) {
    console.error("[itemVectors] getTasteProfile failed:", error);
    return { tasteVector: null, favoriteTitles: [], favoriteCount: 0 };
  }
}

export interface ForYouPick {
  result: MediaResult;
  reason: string;
}

/** Content-based "For You" recommendations via nearest neighbors of the taste vector. */
export async function recallForYou(userId: string, limit = 8): Promise<ForYouPick[]> {
  try {
    const profile = await getTasteProfile(userId);
    if (!profile.tasteVector) return [];

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      select: { media: { select: { sourceApi: true, externalId: true } } },
      take: TASTE_FAVORITE_LIMIT,
    });
    const excludeKeys = new Set(
      favorites.map((f) => `${f.media.sourceApi}:${f.media.externalId}`)
    );

    const matches = await recallItemsByVector(toVectorLiteral(profile.tasteVector), {
      excludeKeys,
      limit,
    });

    const basis =
      profile.favoriteTitles.length > 0
        ? profile.favoriteTitles.join(", ")
        : "your saved items";
    return matches.map((m) => ({
      result: m.result,
      reason: `Because you liked ${basis}`,
    }));
  } catch (error) {
    console.error("[itemVectors] recallForYou failed:", error);
    return [];
  }
}
