import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a Redis client from environment variables
const redis = Redis.fromEnv();

// Create a rate limiter that allows 100 requests per 15 minutes by default
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '15 m'),
  // Optional: prefix for Redis keys
  prefix: 'crossy:ratelimit',
});

/**
 * Check if a request is allowed based on rate limiting
 * @param identifier - Unique identifier for the requester (e.g., IP address, user ID)
 * @returns Object with success flag and rate limit info
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = 100,
  window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}` | `${number}${'ms' | 's' | 'm' | 'h' | 'd'}` = '15 m'
) {
  // Create a new rate limiter with custom limits if provided
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
 * Middleware function for Next.js API routes to apply rate limiting
 * @param identifier - Unique identifier for the requester
 * @param limit - Request limit (default: 100)
 * @param window - Time window (default: '15 m')
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