import { providerRegistry } from '../integrations/registry';
import { getGeminiClient } from '../ai/client';
import { buildMediaRecommendationPrompt } from '../ai/prompts';
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

function cacheKey(query: string): string {
  return `search:${normalizeQuery(query)}`;
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
): Promise<{ results: any[]; fromCache: boolean }> {
  const fullKey = cacheKey(query);

  const cachedFull = await timed(timings, 'cache:full', () => getCachedJson(fullKey));
  if (cachedFull) return { results: cachedFull, fromCache: true };

  const aiResults = await timed(timings, 'gemini:candidates', () =>
    generateAndHydrateCandidates(query, candidatesPromise, baseResults)
  );

  const merged = filterResultsWithImages(dedupeMediaResults([...aiResults, ...baseResults]));

  if (merged.length > 0) {
    await timed(timings, 'cache:write', () =>
      setCachedJson(`fast:${fullKey}`, merged, PROVIDER_CACHE_TTL)
    );
  }

  return { results: merged, fromCache: false };
}

export async function rankMergedResults(
  query: string,
  merged: any[],
  timings?: Timings
): Promise<any[]> {
  const fullKey = cacheKey(query);

  const cachedFull = await timed(timings, 'cache:full', () => getCachedJson(fullKey));
  if (cachedFull) return cachedFull;

  const results = await timed(timings, 'gemini:rank', () => rankWithAi(query, merged));

  await timed(timings, 'cache:write', () =>
    setCachedJsonAndDelete(fullKey, results, CACHE_TTL, `fast:${fullKey}`)
  );
  return results;
}

export async function processMediaQueryEnhanced(
  query: string,
  baseResults: any[],
  timings?: Timings,
  candidatesPromise?: Promise<MediaCandidate[]>
): Promise<any[]> {
  const { results: merged, fromCache } = await mergeMediaQueryResults(query, baseResults, timings, candidatesPromise);
  if (merged.length === 0) return [];
  if (fromCache) return merged;
  return rankMergedResults(query, merged, timings);
}

export async function processMediaQuery(query: string, timings?: Timings): Promise<any[]> {
  const candidatesPromise = generateCandidatesWithAi(query);
  const fast = await processMediaQueryFast(query, timings);
  return processMediaQueryEnhanced(query, fast, timings, candidatesPromise);
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

async function rankWithAi(query: string, allResults: any[]): Promise<any[]> {
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
  const recommendationPrompt = buildMediaRecommendationPrompt(query, compact);

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
