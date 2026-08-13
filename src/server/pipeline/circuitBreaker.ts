import { redis } from '../../lib/redis';
import { MediaSearchProvider, MediaResult } from '../integrations/MediaSearchProvider';
import { deserialize, normalizeQuery, PROVIDER_CACHE_TTL } from '../../lib/cache';

const FAILURE_THRESHOLD = 2;
const WINDOW_SECONDS = 30 * 60;

function cbKey(name: string): string {
  return `cb:${name.toLowerCase()}`;
}

function providerCacheKey(name: string, query: string): string {
  return `provider:${name.toLowerCase()}:${normalizeQuery(query)}`;
}

export async function recordFailure(name: string): Promise<void> {
  try {
    await redis.incr(cbKey(name));
    await redis.expire(cbKey(name), WINDOW_SECONDS);
  } catch (error) {
  }
}

async function readCircuitAndCache(
  name: string,
  query: string
): Promise<[number | null, MediaResult[] | null]> {
  try {
    const [failures, cached] = await redis
      .pipeline()
      .get<number>(cbKey(name))
      .get<string>(providerCacheKey(name, query))
      .exec();
    return [failures ?? null, deserialize<MediaResult[]>(cached)];
  } catch (error) {
    return [null, null];
  }
}

async function writeSuccessAndCache(
  name: string,
  query: string,
  results: MediaResult[]
): Promise<void> {
  try {
    await redis
      .pipeline()
      .del(cbKey(name))
      .set(providerCacheKey(name, query), JSON.stringify(results), { ex: PROVIDER_CACHE_TTL })
      .exec();
  } catch (error) {
  }
}

export async function guardedProviderSearch(
  name: string,
  provider: MediaSearchProvider,
  query: string
): Promise<MediaResult[]> {
  const [failures, cached] = await readCircuitAndCache(name, query);
  if ((failures ?? 0) >= FAILURE_THRESHOLD) {
    return [];
  }
  if (cached) return cached;

  try {
    const results = await provider.search(query);
    await writeSuccessAndCache(name, query, results);
    return results;
  } catch (error) {
    await recordFailure(name);
    return [];
  }
}
