import { Redis } from '@upstash/redis';
export const redis = Redis.fromEnv();

export async function get<T = any>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  return value === null ? null : (value as T);
}

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

export async function del(key: string): Promise<number> {
  return await redis.del(key);
}

export async function exists(key: string): Promise<boolean> {
  const count = await redis.exists(key);
  return count === 1;
}

export async function incr(key: string): Promise<number> {
  return await redis.incr(key);
}

export async function sadd(key: string, value: string): Promise<number> {
  return await redis.sadd(key, value);
}

export async function smembers(key: string): Promise<string[]> {
  return await redis.smembers(key);
}