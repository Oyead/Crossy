#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { Redis } from '@upstash/redis';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    reset: { type: 'boolean', default: false },
  },
});

const scope = positionals[0] ?? 'ranked';
const hitKey = `metrics:cache:${scope}:hit`;
const missKey = `metrics:cache:${scope}:miss`;

const redis = Redis.fromEnv();

if (values.reset) {
  await redis.del(hitKey, missKey);
  console.log(`Reset ${hitKey} and ${missKey}`);
  process.exit(0);
}

const [hits, misses] = await redis.mget(hitKey, missKey);
const hitCount = Number(hits ?? 0);
const missCount = Number(misses ?? 0);
const total = hitCount + missCount;

console.log(`scope      ${scope}`);
console.log(`hits       ${hitCount}`);
console.log(`misses     ${missCount}`);
console.log(`total      ${total}`);
console.log(
  `hit rate   ${total > 0 ? `${((hitCount / total) * 100).toFixed(1)}%` : 'n/a'}`
);
