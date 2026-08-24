import { NextRequest, NextResponse } from 'next/server';
import { providerRegistry } from '@/server/integrations/registry';
import { MediaResult } from '@/server/integrations/MediaSearchProvider';
import { guardedProviderSearch } from '@/server/pipeline/circuitBreaker';
import { dedupeMediaResults, filterResultsWithImages } from '@/server/pipeline/candidateSearch';
import { getCachedJson, setCachedJson, normalizeQuery } from '@/lib/cache';

const MIN_QUERY_LENGTH = 2;
const PER_TYPE_LIMIT = 3;
const MAX_SUGGESTIONS = 8;
const SUGGEST_CACHE_TTL = 10 * 60;
const PROVIDER_DEADLINE_MS = 2200;

const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_REQUESTS = 60;
const rateHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_REQUESTS) {
    rateHits.set(ip, recent);
    return true;
  }
  recent.push(now);
  rateHits.set(ip, recent);

  if (rateHits.size > 5000) {
    for (const [key, times] of Array.from(rateHits.entries())) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) rateHits.delete(key);
    }
  }
  return false;
}

const TYPE_ORDER: MediaResult['type'][] = ['movie', 'tv', 'music', 'book', 'game'];

export interface Suggestion {
  id: string;
  title: string;
  type: MediaResult['type'];
  provider: string;
  coverImage?: string;
  year?: string;
}

function toSuggestion(result: MediaResult): Suggestion {
  return {
    id: result.id,
    title: result.title,
    type: result.type,
    provider: result.provider,
    coverImage: result.coverImage,
    year: result.releaseDate?.slice(0, 4),
  };
}

function pickAcrossTypes(results: MediaResult[]): Suggestion[] {
  const byType = new Map<string, MediaResult[]>();
  for (const result of results) {
    const queue = byType.get(result.type) ?? [];
    if (queue.length < PER_TYPE_LIMIT) queue.push(result);
    byType.set(result.type, queue);
  }

  const picked: MediaResult[] = [];
  let added = true;
  while (picked.length < MAX_SUGGESTIONS && added) {
    added = false;
    for (const type of TYPE_ORDER) {
      if (picked.length >= MAX_SUGGESTIONS) break;
      const next = byType.get(type)?.shift();
      if (next) {
        picked.push(next);
        added = true;
      }
    }
  }

  return picked.map(toSuggestion);
}

async function computeFreshSuggestions(query: string): Promise<Suggestion[]> {
  const entries = providerRegistry.getAllWithNames();
  const buckets: MediaResult[][] = entries.map(() => []);

  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  const settledAll = Promise.all(
    entries.map(({ name, provider }, index) =>
      guardedProviderSearch(name, provider, query)
        .then((results) => {
          buckets[index] = results;
        })
        .catch(() => {})
    )
  );

  try {
    await Promise.race([
      settledAll,
      new Promise<void>((resolve) => {
        deadlineTimer = setTimeout(resolve, PROVIDER_DEADLINE_MS);
      }),
    ]);
  } finally {
    clearTimeout(deadlineTimer);
  }

  const candidates = filterResultsWithImages(dedupeMediaResults(buckets.flat()));
  const suggestions = pickAcrossTypes(candidates);
  void setCachedJson(`suggest:${normalizeQuery(query)}`, suggestions, SUGGEST_CACHE_TTL).catch(
    () => {}
  );
  return suggestions;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (query.length < MIN_QUERY_LENGTH) {
    return NextResponse.json({ suggestions: [] });
  }

  const ip =
    request.headers.get('x-user-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { suggestions: [] },
      { status: 429, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  try {
    const key = `suggest:${normalizeQuery(query)}`;
    const cachedPromise = getCachedJson<Suggestion[]>(key).catch(() => null);
    const freshPromise = computeFreshSuggestions(query);

    const FRESH = Symbol('fresh');
    const winner = await Promise.race([
      cachedPromise,
      freshPromise.then(() => FRESH),
    ]);

    if (winner !== FRESH && Array.isArray(winner)) {
      return NextResponse.json(
        { suggestions: winner },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    }

    const suggestions = await freshPromise;
    return NextResponse.json(
      { suggestions },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('[suggest] failed:', error);
    return NextResponse.json(
      { suggestions: [] },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
