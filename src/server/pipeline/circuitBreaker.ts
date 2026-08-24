import { redis } from '../../lib/redis';
import { MediaSearchProvider, MediaResult } from '../integrations/MediaSearchProvider';
import { deserialize, normalizeQuery, PROVIDER_CACHE_TTL } from '../../lib/cache';
import { compactMediaResults } from './candidateSearch';

const FAILURE_THRESHOLD = 2;
const WINDOW_SECONDS = 30 * 60;
const EMPTY_RESULT_TTL = 60;
const PROBE_COOLDOWN_SECONDS = 60;

function cbKey(name: string): string {
  return `cb:${name.toLowerCase()}`;
}

function cbProbeKey(name: string): string {
  return `cbp:${name.toLowerCase()}`;
}

function providerCacheKey(name: string, query: string): string {
  return `provider:${name.toLowerCase()}:${normalizeQuery(query)}`;
}

export async function recordFailure(name: string): Promise<void> {
  try {
    await redis
      .pipeline()
      .incr(cbKey(name))
      .expire(cbKey(name), WINDOW_SECONDS)
      .set(cbProbeKey(name), String(Math.floor(Date.now() / 1000)), { ex: WINDOW_SECONDS })
      .exec();
  } catch (error) {
  }
}

async function readCircuitAndCache(
  name: string,
  query: string
): Promise<[number | null, MediaResult[] | null, number | null]> {
  try {
    const [failures, cached, lastFailureAt] = await redis
      .pipeline()
      .get<number>(cbKey(name))
      .get<string>(providerCacheKey(name, query))
      .get<number>(cbProbeKey(name))
      .exec();
    return [failures ?? null, deserialize<MediaResult[]>(cached), lastFailureAt ?? null];
  } catch (error) {
    return [null, null, null];
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
      .del(cbProbeKey(name))
      .set(providerCacheKey(name, query), JSON.stringify(results), {
        ex: results.length > 0 ? PROVIDER_CACHE_TTL : EMPTY_RESULT_TTL,
      })
      .exec();
  } catch (error) {
  }
}

export async function guardedProviderSearch(
  name: string,
  provider: MediaSearchProvider,
  query: string
): Promise<MediaResult[]> {
  const [failures, cached, lastFailureAt] = await readCircuitAndCache(name, query);
  if (cached) return cached;

  if ((failures ?? 0) >= FAILURE_THRESHOLD) {
    const nowSec = Math.floor(Date.now() / 1000);
    const cooledDown =
      typeof lastFailureAt === 'number' &&
      nowSec - lastFailureAt >= PROBE_COOLDOWN_SECONDS;
    if (!cooledDown) return [];
  }

  try {
    const results = await provider.search(query);
    const compacted = compactMediaResults(results);
    await writeSuccessAndCache(name, query, compacted);
    return compacted;
  } catch (error) {
    await recordFailure(name);
    return [];
  }
}
