#!/usr/bin/env node
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: process.env.BENCH_URL ?? 'http://localhost:3000' },
    query: { type: 'string', default: 'inception' },
    path: { type: 'string', default: '/api/search?q={query}' },
    runs: { type: 'string', default: '20' },
    warmup: { type: 'string', default: '1' },
    cookie: { type: 'string' },
  },
});

const baseUrl = values.url.replace(/\/$/, '');
const query = values.query;
const runs = Number(values.runs);
const warmup = Number(values.warmup);
const endpoint = values.path.replace('{query}', encodeURIComponent(query));
const headers = values.cookie ? { Cookie: values.cookie } : {};

if (!Number.isFinite(runs) || runs < 1) {
  console.error('--runs must be a positive integer');
  process.exit(1);
}

async function request() {
  const start = performance.now();
  try {
    const res = await fetch(`${baseUrl}${endpoint}`, { headers });
    await res.arrayBuffer();
    return {
      ms: performance.now() - start,
      status: res.status,
      serverTiming: res.headers.get('server-timing'),
    };
  } catch (error) {
    console.error(`\nRequest to ${baseUrl}${endpoint} failed: ${error.message}`);
    process.exit(1);
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

const warmupResults = [];
for (let i = 0; i < warmup; i++) {
  warmupResults.push(await request());
}

const results = [];
for (let i = 0; i < runs; i++) {
  results.push(await request());
}

const failed = results.filter((r) => r.status >= 400);
if (failed.length > 0) {
  console.error(`\n${failed.length}/${runs} requests failed (status ${failed[0].status}).`);
}

const times = results.map((r) => r.ms).sort((a, b) => a - b);
const sum = times.reduce((acc, ms) => acc + ms, 0);

console.log(`\n${baseUrl}${endpoint}`);
console.log(`query="${query}" warmup=${warmup} runs=${runs}\n`);
console.log(`min    ${times[0].toFixed(1)} ms`);
console.log(`mean   ${(sum / times.length).toFixed(1)} ms`);
console.log(`p50    ${percentile(times, 50).toFixed(1)} ms`);
console.log(`p95    ${percentile(times, 95).toFixed(1)} ms`);
console.log(`max    ${times[times.length - 1].toFixed(1)} ms`);

const lastTiming = [...results].reverse().find((r) => r.serverTiming)?.serverTiming;
if (lastTiming) {
  console.log(`\nServer-Timing: ${lastTiming}`);
}
