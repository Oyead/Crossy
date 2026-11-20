import { providerRegistry } from '../integrations/registry';
import { generateTextWithFallback } from '../ai/llmClient';
import { buildMediaRecommendationPrompt, UserTasteContext } from '../ai/prompts';
import { generateCandidatesWithAi, hydrateCandidates, dedupeMediaResults, normalizeTitle } from './candidateSearch';
import type { MediaCandidate } from '../ai/schemas';
import { guardedProviderSearch } from './circuitBreaker';
import { Timings, timed } from '../../lib/trace';
import {
  getCachedJsonMany,
  setCachedJson,
  setCachedJsonAndDelete,
  normalizeQuery,
  CACHE_TTL,
  CACHE_VERSION,
  PROVIDER_CACHE_TTL,
} from '../../lib/cache';
import { recallSimilarQueryMedia, persistSearchMemoryAsync } from '../context/searchMemory';
import { recallItemsByQuery, backfillUnembeddedMediaAsync } from '../context/itemVectors';
import { recallCoClickedItems } from './collaborative';
import { normalizeGenres } from '../integrations/tagMap';
import type { UserSearchSignal } from '../context/userSignal';
import { recordCache } from '../../lib/cacheMetrics';

function cacheKey(query: string): string {
  return `${CACHE_VERSION}:search:${normalizeQuery(query)}`;
}

export function fullCacheKey(query: string, personalization?: UserSearchSignal): string {
  return personalization
    ? `${CACHE_VERSION}:search:u${personalization.userId}:${normalizeQuery(query)}`
    : cacheKey(query);
}

const SEARCH_DEADLINE_MS = 8_000;
const RANK_BUDGET_MS = 2_500;

function withDeadline<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T | Promise<T>
): Promise<T> {
  return new Promise((resolve) => {
    const settleFallback = () => {
      void Promise.resolve(fallback).then(
        (value) => resolve(value),
        () => resolve([] as unknown as T)
      );
    };
    const timer = setTimeout(settleFallback, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        settleFallback();
      }
    );
  });
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

function semanticOrder(results: any[]): any[] {
  return [...results];
}

function buildSemanticFallback(semanticResults: any[], providerResults: any[]): any[] {
  return dedupeMediaResults([...semanticResults, ...providerResults]);
}

function compactDescription(text: any): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= 180) return t;
  const cut = t.slice(0, 180);
  const lastEnd = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  return lastEnd > 60 ? cut.slice(0, lastEnd + 1) : cut;
}

export async function processMediaQueryFast(
  query: string,
  timings?: Timings,
  cachedFull?: any[] | null,
  cachedFast?: any[] | null
): Promise<any[]> {
  const fullKey = cacheKey(query);
  const providerKey = `providers:${fullKey}`;

  if (cachedFull === undefined || cachedFast === undefined) {
    const [full, providers] = await timed(timings, 'cache:checks', () =>
      getCachedJsonMany<any[]>([fullKey, providerKey])
    );
    if (cachedFull === undefined) cachedFull = full;
    if (cachedFast === undefined) cachedFast = providers;
  }
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

  const deduped = dedupeMediaResults(results);
  const sorted = cheapSort(deduped);

  await timed(timings, 'cache:write', () => setCachedJson(providerKey, sorted, PROVIDER_CACHE_TTL));
  return sorted;
}

export async function mergeMediaQueryResults(
  query: string,
  baseResults: any[],
  timings?: Timings,
  candidatesPromise?: Promise<MediaCandidate[]>,
  semanticPromise?: Promise<[any[], any[]]>
): Promise<{ results: any[] }> {
  const semanticRecall =
    semanticPromise ??
    Promise.all([
      timed(timings, 'memory:recall', () => recallSimilarQueryMedia(query)),
      timed(timings, 'vector:recall', () => recallItemsByQuery(query)),
    ]);

  const [aiResults, [memoryResults, vectorResults], cfResults] = await Promise.all([
    timed(timings, 'gemini:candidates', () =>
      generateAndHydrateCandidates(query, candidatesPromise, baseResults)
    ),
    semanticRecall,
    timed(timings, 'cf:recall', () =>
      recallCoClickedItems(
        baseResults
          .slice(0, 3)
          .map((r) => ({ id: String(r.id), type: String(r.type) }))
      )
    ),
  ]);

  const merged = dedupeMediaResults([
    ...aiResults,
    ...vectorResults,
    ...cfResults,
    ...memoryResults,
    ...baseResults,
  ]);

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
  const resultKey = fullCacheKey(query, personalization);
  const fallback = semanticOrder(merged);

  const toPersistable = (results: any[]) =>
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
    }));

  const rankPromise = timed(timings, 'gemini:rank', () =>
    rankWithAi(query, merged, personalization)
  ).then(
    (results) => {
      const ranked = results.length > 0 && results.some((r) => typeof r.confidence === 'number');
      if (ranked) {
        void setCachedJsonAndDelete(resultKey, results, CACHE_TTL, `fast:${cacheKey(query)}`);
      }
      persistSearchMemoryAsync(query, toPersistable(results));
      return results;
    },
    (error) => {
      console.error('[search] ranking failed; using semantic fallback:', error);
      return fallback;
    }
  );

  backfillUnembeddedMediaAsync();

  return withDeadline(rankPromise, RANK_BUDGET_MS, fallback);
}

export async function processMediaQuery(
  query: string,
  timings?: Timings,
  personalization?: UserSearchSignal
): Promise<any[]> {
  const startedAt = Date.now();
  const resultKey = fullCacheKey(query, personalization);
  const fullKey = cacheKey(query);
  const providerKey = `providers:${fullKey}`;
  const fastKey = `fast:${fullKey}`;
  const candidateKey = `${CACHE_VERSION}:candidates:${normalizeQuery(query)}`;

  const [cachedResult, cachedFull, cachedProviders, cachedMerged, cachedCandidates] = await timed(
    timings,
    'cache:checks',
    () => getCachedJsonMany<any>([resultKey, fullKey, providerKey, fastKey, candidateKey])
  );
  if (cachedResult && cachedResult.length > 0) {
    recordCache('hit', 'ranked');
    return diversifyRanked(cachedResult);
  }
  recordCache('miss', 'ranked');

  const remainingMs = SEARCH_DEADLINE_MS - (Date.now() - startedAt);
  if (remainingMs <= 0) return cachedMerged ?? cachedProviders ?? [];

  if (cachedMerged && cachedMerged.length > 0) {
    return rankMergedResults(query, cachedMerged, timings, personalization);
  }

  const candidatesPromise = generateCandidatesWithAi(query, cachedCandidates);
  const semanticPromise = Promise.all([
    timed(timings, 'memory:recall', () => recallSimilarQueryMedia(query)),
    timed(timings, 'vector:recall', () => recallItemsByQuery(query)),
  ]);
  const fast = await processMediaQueryFast(query, timings, cachedFull, cachedProviders);
  const enrich = (async () => {
    const { results: merged } = await mergeMediaQueryResults(
      query,
      fast,
      timings,
      candidatesPromise,
      semanticPromise
    );
    if (merged.length === 0) return fast;
    return rankMergedResults(query, merged, timings, personalization);
  })();

  const semanticFallbackPromise = semanticPromise.then(([memoryResults, vectorResults]) =>
    buildSemanticFallback([...vectorResults, ...memoryResults], fast)
  );

  return withDeadline(
    enrich,
    SEARCH_DEADLINE_MS - (Date.now() - startedAt),
    semanticFallbackPromise
  );
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
      task: 'rank',
      timeoutMs: 6000,
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
      throw new Error('[search] ranking returned no recommendations');
    }

    const enriched = recommendations
      .map((rec: any) => {
        const item = limitedResults[rec.index];
        if (!item || typeof rec.confidence !== 'number') return null;
        return {
          ...item,
          reason: typeof rec.reason === 'string' ? rec.reason : undefined,
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
    if (enriched.length === 0) {
      throw new Error('[search] ranking produced no valid candidates');
    }
    const rankedIds = new Set(enriched.map((r) => r.id));
    const leftovers = limitedResults.filter((r) => !rankedIds.has(r.id));

    return [...enriched, ...leftovers];
  } catch (error) {
    console.error('[search] Gemini ranking failed:', error);
    throw error;
  }
}
