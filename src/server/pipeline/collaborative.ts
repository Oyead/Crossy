import prisma from "@/server/db/prisma";
import type { MediaResult } from "../integrations/MediaSearchProvider";
import { mediaRowToResult } from "../context/itemVectors";

const SEED_LIMIT = 3;
const COCLICK_LIMIT = 6;

export interface SeedItem {
  id: string;
  type: string;
}

/**
 * Lightweight item-to-item collaborative filtering:
 * "users who clicked X also clicked Y", from logged interaction events.
 * Returns nothing until real click traffic accumulates.
 */
export async function recallCoClickedItems(
  seeds: SeedItem[],
  excludeKeys?: Set<string>
): Promise<MediaResult[]> {
  try {
    const seedItems = seeds.slice(0, SEED_LIMIT);
    if (seedItems.length === 0) return [];

    const clickers = await prisma.interaction.findMany({
      where: {
        kind: "click",
        userId: { not: null },
        OR: seedItems.map((s) => ({
          mediaType: s.type,
          externalId: s.id,
        })),
      },
      select: { userId: true },
      distinct: ["userId"],
      take: 200,
    });
    const userIds = clickers
      .map((c) => c.userId)
      .filter((id): id is string => Boolean(id));
    if (userIds.length === 0) return [];

    const coClicks = await prisma.interaction.groupBy({
      by: ["mediaType", "externalId"],
      where: {
        kind: "click",
        userId: { in: userIds },
        NOT: {
          OR: seedItems.map((s) => ({
            mediaType: s.type,
            externalId: s.id,
          })),
        },
      },
      _count: { externalId: true },
      orderBy: { _count: { externalId: "desc" } },
      take: COCLICK_LIMIT * 2,
    });
    if (coClicks.length === 0) return [];

    const mediaRows = await prisma.media.findMany({
      where: {
        OR: coClicks.map((c) => ({
          mediaType: c.mediaType,
          externalId: c.externalId,
        })),
      },
    });

    const countByKey = new Map(
      coClicks.map((c) => [
        `${c.mediaType}:${c.externalId}`,
        c._count.externalId,
      ])
    );
    const results = mediaRows
      .sort(
        (a, b) =>
          (countByKey.get(`${b.mediaType}:${b.externalId}`) ?? 0) -
          (countByKey.get(`${a.mediaType}:${a.externalId}`) ?? 0)
      )
      .filter(
        (row) =>
          !excludeKeys || !excludeKeys.has(`${row.sourceApi}:${row.externalId}`)
      )
      .slice(0, COCLICK_LIMIT)
      .map(mediaRowToResult);

    if (results.length > 0) {
      console.log(`[collab] Co-click recall hit ${results.length} items from ${userIds.length} users`);
    }
    return results;
  } catch (error) {
    console.error("[collab] recallCoClickedItems failed:", error);
    return [];
  }
}
