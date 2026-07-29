import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'),
  prefix: 'crossy:ratelimit',
});

/**
 * 
 * @param identifier - 
 * @returns 
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` | `${number}${'ms' | 's' | 'm' | 'h' | 'd'}` = '15 m'
) {
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

/**
 * 
 * @param identifier
 * @param limit 
 * @param window
 */
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