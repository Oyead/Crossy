import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

try {
  redis = Redis.fromEnv();
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    prefix: 'crossy:ratelimit',
  });
} catch (error) {
  console.warn('Upstash Redis not configured. Rate limiting is disabled.', error);
}

export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` | `${number}${'ms' | 's' | 'm' | 'h' | 'd'}` = '15 m'
) {
  if (!redis) {
    return { success: true, limit, remaining: limit, reset: Date.now() + 15 * 60 * 1000 };
  }

  const customRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: 'crossy:ratelimit',
  });

  const result = await customRatelimit.limit(identifier);

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
}

export async function rateLimitMiddleware(
  identifier: string,
  limit: number = 100,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` | `${number}${'ms' | 's' | 'm' | 'h' | 'd'}` = '15 m'
) {
  const result = await checkRateLimit(identifier, limit, window);

  if (!result.success) {
    throw new Error('Rate limit exceeded');
  }

  return result;
}