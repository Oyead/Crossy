import { providerRegistry } from '../integrations/registry';
import { generateTextWithFallback } from '../ai/llmClient';
import { buildMediaRecommendationPrompt, UserTasteContext } from '../ai/prompts';
import { generateCandidatesWithAi, hydrateCandidates, dedupeMediaResults, filterResultsWithImages, normalizeTitle } from './candidateSearch';
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
import { recallItemsByQuery, backfillUnembeddedMediaAsync } from '../context/itemVectors';
import { recallCoClickedItems } from './collaborative';
import { normalizeGenres } from '../integrations/tagMap';
import type { UserSearchSignal } from '../context/userSignal';

function cacheKey(query: string): string {
  return `search:${normalizeQuery(query)}`;
}

export function fullCacheKey(query: string, personalization?: UserSearchSignal): string {
  return personalization
    ? `search:u${personalization.userId}:${normalizeQuery(query)}`
    : cacheKey(query);
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

  const [memoryResults, vectorResults, cfResults] = await Promise.all([
    timed(timings, 'memory:recall', () => recallSimilarQueryMedia(query)),
    timed(timings, 'vector:recall', () => recallItemsByQuery(query)),
    timed(timings, 'cf:recall', () =>
      recallCoClickedItems(
        baseResults
          .slice(0, 3)
          .map((r) => ({ id: String(r.id), type: String(r.type) }))
      )
    ),
  ]);

  const merged = filterResultsWithImages(
    dedupeMediaResults([
      ...aiResults,
      ...vectorResults,
      ...cfResults,
      ...memoryResults,
      ...baseResults,
    ])
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
  personalization?: UserSearchSignal,
  cachedFullPromise?: Promise<any | null>
): Promise<any[]> {
  const resultKey = fullCacheKey(query, personalization);

  const cachedFullPromiseResolved =
    cachedFullPromise ?? getCachedJson(resultKey);
  const cachedFull = await timed(timings, 'cache:full', () => cachedFullPromiseResolved);
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
      description: r.description,
      genres: r.genres,
      creators: r.creators,
      rating: typeof r.rating === 'number' ? r.rating : undefined,
      releaseDate: typeof r.releaseDate === 'string' ? r.releaseDate : undefined,
      reason: r.reason,
      confidence: r.confidence,
      userId: personalization?.userId ?? null,
    }))
  );
  backfillUnembeddedMediaAsync();

  return results;
}

export async function processMediaQueryEnhanced(
  query: string,
  baseResults: any[],
  timings?: Timings,
  candidatesPromise?: Promise<MediaCandidate[]>,
  personalization?: UserSearchSignal
): Promise<any[]> {
  const cachedFullPromise = getCachedJson(fullCacheKey(query, personalization));
  const cachedFull = await timed(timings, 'cache:full', () => cachedFullPromise);
  if (cachedFull) return diversifyRanked(cachedFull);

  const { results: merged } = await mergeMediaQueryResults(query, baseResults, timings, candidatesPromise);
  if (merged.length === 0) return [];
  return rankMergedResults(query, merged, timings, personalization, cachedFullPromise);
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
  const limitedResults = allResults.slice(0, 25);
  const compact = limitedResults.map((r, index) => ({
    index,
    title: r.title,
    type: r.type,
    provider: r.provider,
    releaseDate: r.releaseDate ?? null,
    rating: r.rating ?? null,
    genres: normalizeGenres(r.genres)?.slice(0, 5) ?? [],
    creators: Array.isArray(r.creators) ? r.creators.slice(0, 3) : [],
    description: compactDescription(r.description),
  }));

  const tasteContext: UserTasteContext | undefined = personalization
    ? { favorites: personalization.favorites, recentSearches: personalization.recentSearches }
    : undefined;
  const recommendationPrompt = buildMediaRecommendationPrompt(query, compact, tasteContext);

  try {
    const { text: aiResponse, provider } = await generateTextWithFallback({
      prompt: recommendationPrompt,
      taskLabel: 'rank',
      timeoutMs: 15000,
    });
    console.log(`[search] rank via ${provider} for "${query}"`);

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

    // Safety net: never lose candidates the model skipped or duplicated.
    const queryKey = normalizeTitle(query);
    const directMatch = limitedResults.find(
      (r) => normalizeTitle(r.title) === queryKey
    );
    if (directMatch && !enriched.some((r) => r.id === directMatch.id)) {
      enriched.unshift({ ...directMatch, confidence: 1, reason: 'Exact match for your search' });
    }
    const rankedIds = new Set(enriched.map((r) => r.id));
    const leftovers = limitedResults.filter((r) => !rankedIds.has(r.id));

    return [...enriched, ...leftovers];
  } catch (error) {
    console.error('[search] Gemini ranking failed:', error);
    return limitedResults;
  }
}
