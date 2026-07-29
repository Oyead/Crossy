import { Redis } from '@upstash/redis';
export const redis = Redis.fromEnv();

/**
 * 
 * @param key 
 * @returns 
 */
export async function get<T = any>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value === null ? null : (value as T);
}

/**
 
 * @param key 
 * @param value 
 * @param expire 
 * @returns 
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
 * 
 * @param key
 * @returns
 */
export async function del(key: string): Promise<number> {
  return await redis.del(key);
}

/**
 *
 * @param key 
 * @returns 
 */
export async function exists(key: string): Promise<boolean> {
  const count = await redis.exists(key);
  return count === 1;
}

/**
 * @param key
 * @returns
 */
export async function incr(key: string): Promise<number> {
  return await redis.incr(key);
}

/**
 * @param key 
 * @param value 
 * @returns 
 */
export async function sadd(key: string, value: string): Promise<number> {
  return await redis.sadd(key, value);
}

/**
 * @param key 
 * @returns 
 */
export async function smembers(key: string): Promise<string[]> {
  return await redis.smembers(key);
}