import prisma from "@/server/db/prisma";

export interface UserSearchSignal {
  userId: string;
  favorites: string[];
  recentSearches: string[];
}

export async function getUserSearchSignal(
  userId: string,
  excludeQuery?: string
): Promise<UserSearchSignal> {
  const [favorites, recentSearches] = await Promise.all([
    getFavoriteTitles(userId),
    getRecentSearchInputs(userId, excludeQuery),
  ]);

  return { userId, favorites, recentSearches };
}

async function getFavoriteTitles(userId: string): Promise<string[]> {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        media: { select: { title: true, mediaType: true } },
      },
    });

    return favorites
      .map((f) =>
        f.media?.title ? `${f.media.title} (${f.media.mediaType})` : null
      )
      .filter((t): t is string => Boolean(t));
  } catch (error) {
    console.error("[userSignal] Failed to load favorites:", error);
    return [];
  }
}

async function getRecentSearchInputs(
  userId: string,
  excludeQuery?: string
): Promise<string[]> {
  try {
    const rows = await prisma.searchQuery.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      distinct: ["rawInput"],
      take: 15,
      select: { rawInput: true },
    });

    return rows
      .map((r) => r.rawInput)
      .filter((raw) => !excludeQuery || raw.toLowerCase() !== excludeQuery.toLowerCase())
      .slice(0, 10);
  } catch (error) {
    console.error("[userSignal] Failed to load recent searches:", error);
    return [];
  }
}
