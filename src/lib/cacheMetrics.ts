import { redis } from './redis';

export type CacheScope = 'ranked';

export function hitKey(scope: CacheScope): string {
  return `metrics:cache:${scope}:hit`;
}

export function missKey(scope: CacheScope): string {
  return `metrics:cache:${scope}:miss`;
}

export function recordCache(kind: 'hit' | 'miss', scope: CacheScope): void {
  const key = kind === 'hit' ? hitKey(scope) : missKey(scope);
  redis.incr(key).catch(() => {});
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number | null;
}

export async function readCacheStats(scope: CacheScope): Promise<CacheStats> {
  const [hits, misses] = await redis.mget<[number | null, number | null]>([
    hitKey(scope),
    missKey(scope),
  ]);
  const hitCount = Number(hits ?? 0);
  const missCount = Number(misses ?? 0);
  const total = hitCount + missCount;
  return {
    hits: hitCount,
    misses: missCount,
    hitRate: total > 0 ? hitCount / total : null,
  };
}
