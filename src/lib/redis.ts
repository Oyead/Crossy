// src/lib/redis.ts
import { Redis } from '@upstash/redis';

// Create a Redis client from environment variables
// This singleton instance can be used throughout the application
export const redis = Redis.fromEnv();

/**
 * Get a value from Redis by key
 * @param key - The key to retrieve
 * @returns The value or null if not found
 */
export async function get<T = any>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value === null ? null : (value as T);
}

/**
 * Set a value in Redis with optional expiration
 * @param key - The key to store
 * @param value - The value to store
 * @param expire - Expiration time in seconds (optional)
 * @returns Success status
 */
export async function set(
  key: string,
  value: any,
  expire?: number
): Promise<boolean> {
  if (expire) {
    const result = await redis.setex(key, expire, value);
    return result === 'OK';
  }
  const result = await redis.set(key, value);
  return result === 'OK';
}

/**
 * Delete a key from Redis
 * @param key - The key to delete
 * @returns Number of keys deleted
 */
export async function del(key: string): Promise<number> {
  return await redis.del(key);
}

/**
 * Check if a key exists in Redis
 * @param key - The key to check
 * @returns True if key exists
 */
export async function exists(key: string): Promise<boolean> {
  const count = await redis.exists(key);
  return count === 1;
}

/**
 * Increment a numeric value in Redis
 * @param key - The key to increment
 * @returns New value after increment
 */
export async function incr(key: string): Promise<number> {
  return await redis.incr(key);
}

/**
 * Add to a set in Redis
 * @param key - The set key
 * @param value - The value to add
 * @returns Number of elements added
 */
export async function sadd(key: string, value: string): Promise<number> {
  return await redis.sadd(key, value);
}

/**
 * Get all members of a set in Redis
 * @param key - The set key
 * @returns Array of set members
 */
export async function smembers(key: string): Promise<string[]> {
  return await redis.smembers(key);
}