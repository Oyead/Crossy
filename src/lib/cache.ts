import { redis } from './redis';

export const CACHE_TTL = 60 * 60; // final ranked results
export const PROVIDER_CACHE_TTL = 20 * 60; // raw provider responses

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Upstash Redis auto-deserializes valid JSON on GET, so values can arrive as
// either a raw string or an already-parsed object. Handle both.
function deserialize<T>(value: any): T | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }
  return value as T;
}

export async function getCachedJson<T = any>(key: string): Promise<T | null> {
  try {
    return deserialize<T>(await redis.get(key));
  } catch (error) {
    // Cache errors should never block a search
    return null;
  }
}

// Batches several cache reads into a single Redis round trip (Upstash
// pipelines are far cheaper than N sequential REST calls).
export async function getCachedJsonMany<T = any>(keys: string[]): Promise<(T | null)[]> {
  try {
    if (keys.length === 0) return [];
    const pipe = redis.pipeline();
    keys.forEach((key) => pipe.get(key));
    const values = await pipe.exec();
    return values.map((value: any) => deserialize<T>(value));
  } catch (error) {
    return keys.map(() => null);
  }
}

export async function setCachedJson(
  key: string,
  value: any,
  ttlSeconds: number
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
  } catch (error) {
    // Ignore cache write failures
  }
}

// Writes one key and deletes another in a single round trip.
export async function setCachedJsonAndDelete(
  setKey: string,
  value: any,
  ttlSeconds: number,
  deleteKey: string
): Promise<void> {
  try {
    await redis
      .pipeline()
      .set(setKey, JSON.stringify(value), { ex: ttlSeconds })
      .del(deleteKey)
      .exec();
  } catch (error) {
    // Ignore cache write failures
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    // Ignore cache deletion failures
  }
}
