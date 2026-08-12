import { providerRegistry } from '../integrations/registry';
import { getGeminiClient } from '../ai/client';
import { buildMediaRecommendationPrompt } from '../ai/prompts';
import { generateCandidatesWithAi, hydrateCandidates, dedupeMediaResults } from './candidateSearch';
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

// Cheap ordering so the grid is useful before AI ranking arrives.
function cheapSort(results: any[]): any[] {
  return [...results].sort((a, b) => {
    const ar = typeof a.rating === 'number' ? a.rating : -1;
    const br = typeof b.rating === 'number' ? b.rating : -1;
    if (br !== ar) return br - ar;
    return String(a.title).localeCompare(String(b.title));
  });
}

// Trim long blurbs to ~1-2 sentences before sending to Gemini.
function compactDescription(text: any): string {
  const t = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (t.length <= 180) return t;
  const cut = t.slice(0, 180);
  const lastEnd = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('!'), cut.lastIndexOf('?'));
  return lastEnd > 60 ? cut.slice(0, lastEnd + 1) : cut;
}

// Fast path: provider keyword search + dedupe only. Rendered immediately.
export async function processMediaQueryFast(query: string, timings?: Timings): Promise<any[]> {
  const fullKey = cacheKey(query);
  const fastKey = `fast:${fullKey}`;

  // If the enhanced result is already cached, serve it straight away.
  // Both cache reads go out in a single Redis round trip.
  const [cachedFull, cachedFast] = await timed(timings, 'cache:checks', () =>
    getCachedJsonMany([fullKey, fastKey])
  );
  if (cachedFull) return cachedFull;
  if (cachedFast) return cachedFast;

  // Each provider is guarded (circuit breaker + per-provider raw cache), so a
  // dead provider like RAWG is skipped rather than costing a full timeout.
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

  await timed(timings, 'cache:write', () => setCachedJson(fastKey, sorted, PROVIDER_CACHE_TTL));
  return sorted;
}

// Enhanced path: AI vibe candidates + ranking with reasons/confidence.
export async function processMediaQueryEnhanced(
  query: string,
  baseResults: any[],
  timings?: Timings
): Promise<any[]> {
  const fullKey = cacheKey(query);

  const cachedFull = await timed(timings, 'cache:full', () => getCachedJson(fullKey));
  if (cachedFull) return cachedFull;

  const aiResults = await timed(timings, 'gemini:candidates', () => generateAndHydrateCandidates(query));

  // AI-hydrated candidates first so vibe matches always get ranked,
  // even when keyword search floods the pool with literal hits.
  const merged = dedupeMediaResults([...aiResults, ...baseResults]);

  if (merged.length === 0) {
    return [];
  }

  const results = await timed(timings, 'gemini:rank', () => rankWithAi(query, merged));

  // Write the full result and drop the stale fast cache in one round trip.
  await timed(timings, 'cache:write', () =>
    setCachedJsonAndDelete(fullKey, results, CACHE_TTL, `fast:${fullKey}`)
  );
  return results;
}

export async function processMediaQuery(query: string, timings?: Timings): Promise<any[]> {
  const fast = await processMediaQueryFast(query, timings);
  return processMediaQueryEnhanced(query, fast, timings);
}

async function generateAndHydrateCandidates(query: string): Promise<any[]> {
  try {
    const candidates = await generateCandidatesWithAi(query);
    if (candidates.length === 0) return [];
    return await hydrateCandidates(candidates);
  } catch (error) {
    return [];
  }
}

async function rankWithAi(query: string, allResults: any[]): Promise<any[]> {
  const limitedResults = allResults.slice(0, 20);
  // Send only the fields Gemini needs — raw API payloads are huge and slow it down.
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

    // Try streaming first for potentially lower latency
    let aiResponse = '';
    if (typeof model.generateContentStream === 'function') {
      try {
        const stream = model.generateContentStream(recommendationPrompt);
        for await (const chunk of stream) {
          const chunkText = chunk.text();
          aiResponse += chunkText;
        }
      } catch (streamError) {
        // Fall back to non-streaming if streaming fails
        console.warn('[search] Gemini streaming failed, falling back to non-streaming:', streamError);
        const result = await model.generateContent(recommendationPrompt);
        aiResponse = result.response.text();
      }
    } else {
      // Fall back to non-streaming if streaming not supported
      const result = await model.generateContent(recommendationPrompt);
      aiResponse = result.response.text();
    }

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

    // Map each AI recommendation back to its already-fetched search result
    // using the list index, avoiding a second API call per item.
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
