// src/server/db/cache.ts
import { redis } from "../../lib/redis";

/**
 * Get a value from cache by key
 * @param key - The cache key
 * @returns The cached value or null if not found/expired
 */
export async function get<T = any>(key: string): Promise<T | null> {
  return await redis.get<T>(key);
}

/**
 * Set a value in cache with optional expiration
 * Set a value in cache with optional expiration
 * @param key - The cache key
 * @param value - The value to cache
 * @param ttl - Time to live in seconds (optional, defaults to 1 hour)
 * @returns Success status
 */
export async function set(
  key: string,
  value: any,
  ttl: number = 60 * 60 // 1 hour default
): Promise<boolean> {
  if (ttl > 0) {
    const result = await redis.setex(key, ttl, value);
    return result === 'OK';
  }
  const result = await redis.set(key, value);
  return result === 'OK';
}

/**
 * Delete a value from cache by key
 * @param key - The cache key
 * @returns Number of keys deleted
 */
export async function del(key: string): Promise<number> {
  return await redis.del(key);
}

/**
 * Check if a key exists in cache
 * @param key - The cache key
 * @returns True if key exists
 */
export async function has(key: string): Promise<boolean> {
  return await redis.exists(key) === 1;
}

/**
 * Increment a numeric value in cache
 * @param key - The cache key
 * @returns New value after increment
 */
export async function incr(key: string): Promise<number> {
  return await redis.incr(key);
}

/**
 * Get multiple values from cache by keys
 * @param keys - Array of cache keys
 * @returns Array of cached values (null for missing/expired keys)
 */
export async function getMany<T = any>(keys: string[]): Promise<Array<T | null>> {
  const results: Array<T | null> = [];
  for (const key of keys) {
    const value = await redis.get<T>(key);
    results.push(value === null ? null : value);
  }
  return results;
}

/**
 * Set multiple values in cache
 * @param keyValuePairs - Array of [key, value] pairs
 * @param ttl - Time to live in seconds (optional)
 * @returns Array of success statuses
 */
export async function setMany(
  keyValuePairs: Array<[string, any]>,
  ttl: number = 60 * 60 // 1 hour default
): Promise<boolean[]> {
  const results: boolean[] = [];
  for (const [key, value] of keyValuePairs) {
    let success: boolean;
    if (ttl > 0) {
      const result = await redis.setex(key, ttl, value);
      success = result === 'OK';
    } else {
      const result = await redis.set(key, value);
      success = result === 'OK';
    }
    results.push(success);
  }
  return results;
}