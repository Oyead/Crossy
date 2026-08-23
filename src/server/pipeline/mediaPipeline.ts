import { providerRegistry } from '../integrations/registry';
import { getGeminiClient } from '../ai/client';
import { buildMediaRecommendationPrompt, UserTasteContext } from '../ai/prompts';
import { generateCandidatesWithAi, hydrateCandidates, dedupeMediaResults, filterResultsWithImages } from './candidateSearch';
import type { MediaCandidate } from '../ai/schemas';
import { guardedProviderSearch } from './circuitBreaker';
import { Timings, timed } from '../../lib/trace';
import {
  getCachedJson,
  getCachedJsonMany,
  setCachedJson,
  setCachedJsonAndDelete,
  normalizeQuery,
  CACHE_TTL,
  PROVIDER_CACHE_TTL,
} from '../../lib/cache';
import { recallSimilarQueryMedia, persistSearchMemoryAsync } from '../context/searchMemory';
import type { UserSearchSignal } from '../context/userSignal';

function cacheKey(query: string): string {
  return `search:${normalizeQuery(query)}`;
}

const CONFIDENCE_BANDS: Array<[number, number]> = [
  [0.8, Infinity],
  [0.6, 0.8],
  [0.4, 0.6],
  [0, 0.4],
];

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function diversifyRanked<T extends { confidence?: number }>(results: T[]): T[] {
  if (!results.some((r) => typeof r.confidence === 'number')) return results;

  const buckets: T[][] = CONFIDENCE_BANDS.map(() => []);
  const tail: T[] = [];

  for (const item of results) {
    const c = typeof item.confidence === 'number' ? item.confidence : null;
    if (c === null) {
      tail.push(item);
      continue;
    }
    const idx = CONFIDENCE_BANDS.findIndex(([lo, hi]) => c >= lo && c < hi);
    buckets[idx === -1 ? CONFIDENCE_BANDS.length - 1 : idx].push(item);
  }

  return [...buckets.flatMap((band) => shuffleInPlace([...band])), ...tail];
}

function cheapSort(results: any[]): any[] {
  return [...results].sort((a, b) => {
    const ar = typeof a.rating === 'number' ? a.rating : -1;
    const br = typeof b.rating === 'number' ? b.rating : -1;
    if (br !== ar) return br - ar;
    return String(a.title).localeCompare(String(b.title));
  });
}

function compactDescription(text: any): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= 180) return t;
  const cut = t.slice(0, 180);
  const lastEnd = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  return lastEnd > 60 ? cut.slice(0, lastEnd + 1) : cut;
}

export async function processMediaQueryFast(query: string, timings?: Timings): Promise<any[]> {
  const fullKey = cacheKey(query);
  const fastKey = `fast:${fullKey}`;

  const [cachedFull, cachedFast] = await timed(timings, 'cache:checks', () =>
    getCachedJsonMany([fullKey, fastKey])
  );
  if (cachedFull) return cachedFull;
  if (cachedFast) return cachedFast;

  const results = await timed(timings, 'providers', async () => {
    const batches = await Promise.all(
      providerRegistry.getAllWithNames().map(({ name, provider }) =>
        guardedProviderSearch(name, provider, query)
      )
    );
    return batches.flat();
  });

  const deduped = filterResultsWithImages(dedupeMediaResults(results));
  const sorted = cheapSort(deduped);

  await timed(timings, 'cache:write', () => setCachedJson(fastKey, sorted, PROVIDER_CACHE_TTL));
  return sorted;
}

export async function mergeMediaQueryResults(
  query: string,
  baseResults: any[],
  timings?: Timings,
  candidatesPromise?: Promise<MediaCandidate[]>
): Promise<{ results: any[] }> {
  const aiResults = await timed(timings, 'gemini:candidates', () =>
    generateAndHydrateCandidates(query, candidatesPromise, baseResults)
  );

  const memoryResults = await timed(timings, 'memory:recall', () =>
    recallSimilarQueryMedia(query)
  );

  const merged = filterResultsWithImages(
    dedupeMediaResults([...aiResults, ...memoryResults, ...baseResults])
  );

  if (merged.length > 0) {
    await timed(timings, 'cache:write', () =>
      setCachedJson(`fast:${cacheKey(query)}`, merged, PROVIDER_CACHE_TTL)
    );
  }

  return { results: merged };
}

export async function rankMergedResults(
  query: string,
  merged: any[],
  timings?: Timings,
  personalization?: UserSearchSignal
): Promise<any[]> {
  const resultKey = personalization
    ? `search:u${personalization.userId}:${normalizeQuery(query)}`
    : cacheKey(query);

  const cachedFull = await timed(timings, 'cache:full', () => getCachedJson(resultKey));
  if (cachedFull) return diversifyRanked(cachedFull);

  const results = await timed(timings, 'gemini:rank', () =>
    rankWithAi(query, merged, personalization)
  );

  await timed(timings, 'cache:write', () =>
    setCachedJsonAndDelete(resultKey, results, CACHE_TTL, `fast:${cacheKey(query)}`)
  );

  persistSearchMemoryAsync(
    query,
    results.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      provider: r.provider,
      posterUrl: r.coverImage,
      reason: r.reason,
      confidence: r.confidence,
      userId: personalization?.userId ?? null,
    }))
  );

  return results;
}

export async function processMediaQueryEnhanced(
  query: string,
  baseResults: any[],
  timings?: Timings,
  candidatesPromise?: Promise<MediaCandidate[]>,
  personalization?: UserSearchSignal
): Promise<any[]> {
  const resultKey = personalization
    ? `search:u${personalization.userId}:${normalizeQuery(query)}`
    : cacheKey(query);

  const cachedFull = await timed(timings, 'cache:full', () => getCachedJson(resultKey));
  if (cachedFull) return diversifyRanked(cachedFull);

  const { results: merged } = await mergeMediaQueryResults(query, baseResults, timings, candidatesPromise);
  if (merged.length === 0) return [];
  return rankMergedResults(query, merged, timings, personalization);
}

export async function processMediaQuery(
  query: string,
  timings?: Timings,
  personalization?: UserSearchSignal
): Promise<any[]> {
  const candidatesPromise = generateCandidatesWithAi(query);
  const fast = await processMediaQueryFast(query, timings);
  return processMediaQueryEnhanced(query, fast, timings, candidatesPromise, personalization);
}

async function generateAndHydrateCandidates(
  query: string,
  candidatesPromise?: Promise<MediaCandidate[]>,
  baseResults?: any[]
): Promise<any[]> {
  try {
    const candidates = candidatesPromise ?? generateCandidatesWithAi(query);
    const startGen = performance.now();
    const list = await candidates;
    console.log(`[search] candidates:gen ${Math.round(performance.now() - startGen)}ms for "${query}"`);
    if (!list || list.length === 0) return [];
    const startHydrate = performance.now();
    const hydrated = await hydrateCandidates(list, baseResults);
    console.log(`[search] candidates:hydrate ${Math.round(performance.now() - startHydrate)}ms (${list.length} candidates -> ${hydrated.length})`);
    return hydrated;
  } catch (error) {
    return [];
  }
}

async function rankWithAi(
  query: string,
  allResults: any[],
  personalization?: UserSearchSignal
): Promise<any[]> {
  const limitedResults = allResults.slice(0, 20);
  const compact = limitedResults.map((r, index) => ({
    index,
    title: r.title,
    type: r.type,
    provider: r.provider,
    releaseDate: r.releaseDate ?? null,
    rating: r.rating ?? null,
    genres: Array.isArray(r.genres) ? r.genres.slice(0, 5) : [],
    creators: Array.isArray(r.creators) ? r.creators.slice(0, 3) : [],
    description: compactDescription(r.description),
  }));

  const tasteContext: UserTasteContext | undefined = personalization
    ? { favorites: personalization.favorites, recentSearches: personalization.recentSearches }
    : undefined;
  const recommendationPrompt = buildMediaRecommendationPrompt(query, compact, tasteContext);

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const result = await model.generateContent(recommendationPrompt, { timeout: 15000 });
    const aiResponse = result.response.text();

    let recommendations: any[] = [];
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        recommendations = parsed.recommendations;
      } else if (Array.isArray(parsed)) {
        recommendations = parsed;
      }
    }

    if (recommendations.length === 0) {
      return limitedResults;
    }

    const enriched = recommendations
      .map((rec: any) => {
        const item = limitedResults[rec.index];
        if (!item) return null;
        return {
          ...item,
          reason: rec.reason,
          confidence: rec.confidence,
        };
      })
      .filter((rec: any): rec is any => rec !== null);

    return enriched.length > 0 ? enriched : limitedResults;
  } catch (error) {
    console.error('[search] Gemini ranking failed:', error);
    return limitedResults;
  }
}
