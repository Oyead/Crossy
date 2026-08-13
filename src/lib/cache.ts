import { redis } from './redis';

export const CACHE_TTL = 60 * 60;
export const PROVIDER_CACHE_TTL = 20 * 60;

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function deserialize<T>(value: any): T | null {
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
    return null;
  }
}

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
  }
}

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
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
  }
}
