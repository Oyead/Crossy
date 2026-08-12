import { redis } from '../../lib/redis';
import { MediaSearchProvider, MediaResult } from '../integrations/MediaSearchProvider';
import { normalizeQuery, PROVIDER_CACHE_TTL } from '../../lib/cache';

const FAILURE_THRESHOLD = 2; // N failures before tripping open
const WINDOW_SECONDS = 30 * 60; // keep the breaker open for 30 minutes

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
    // Ignore circuit breaker write failures
  }
}

// Circuit state + provider cache read in a single round trip.
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
    return [failures ?? null, cached ? (JSON.parse(cached) as MediaResult[]) : null];
  } catch (error) {
    return [null, null];
  }
}

// Breaker reset + provider cache write in a single round trip.
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
    // Ignore circuit breaker write failures
  }
}

// Skips the provider entirely when its circuit is open, serves its raw
// response from the per-provider cache when warm, and otherwise calls it —
// recording failures so a dead provider stops blocking future searches.
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
