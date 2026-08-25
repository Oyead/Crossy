import { redis } from '@/lib/redis';

const PREFIX = 'webauthn:challenge:';
const TTL_SECONDS = 5 * 60; // 5 minutes

export async function getChallenge(token: string): Promise<{ challenge: string; expires: number } | null> {
  const value = await redis.get<{ challenge: string; expires: number }>(`${PREFIX}${token}`);
  return value ?? null;
}

export async function setChallenge(token: string, challenge: string, expires: number): Promise<void> {
  await redis.setex(`${PREFIX}${token}`, TTL_SECONDS, { challenge, expires });
}

export async function deleteChallenge(token: string): Promise<void> {
  await redis.del(`${PREFIX}${token}`);
}
