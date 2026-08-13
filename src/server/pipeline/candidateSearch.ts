import { providerRegistry } from '../integrations/registry';
import { getGeminiClient } from '../ai/client';
import { buildMediaCandidatePrompt } from '../ai/prompts';
import { mediaCandidatesSchema, MediaCandidate } from '../ai/schemas';
import { MediaResult } from '../integrations/MediaSearchProvider';
import { guardedProviderSearch } from './circuitBreaker';
import { getCachedJson, setCachedJson, normalizeQuery } from '../../lib/cache';

const CONCURRENCY = 10;
const CANDIDATE_CACHE_TTL = 15 * 60;

export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function dedupeMediaResults(results: MediaResult[]): MediaResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = `${result.provider}:${normalizeTitle(result.title)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function filterResultsWithImages<T extends { coverImage?: string }>(results: T[]): T[] {
  return results.filter((result) => Boolean(result.coverImage));
}

export async function generateCandidatesWithAi(query: string): Promise<MediaCandidate[]> {
  const cacheKey = `candidates:${normalizeQuery(query)}`;

  try {
    const cached = await getCachedJson<MediaCandidate[]>(cacheKey);
    if (cached && cached.length > 0) return cached;
  } catch (error) {
  }

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(buildMediaCandidatePrompt(query), { timeout: 12000 });
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const candidates = Array.isArray(parsed) ? parsed : parsed.candidates;

    const validated = mediaCandidatesSchema.safeParse(candidates);
    if (!validated.success) return [];

    await setCachedJson(cacheKey, validated.data, CANDIDATE_CACHE_TTL);
    return validated.data;
  } catch (error) {
    return [];
  }
}

async function hydrateCandidate(
  candidate: MediaCandidate,
  baseResults: MediaResult[] = []
): Promise<MediaResult | null> {
  const normalizedTitle = normalizeTitle(candidate.title);

  const existing = baseResults.find(
    (r) => normalizeTitle(r.title) === normalizedTitle && r.coverImage
  );
  if (existing) {
    return {
      ...existing,
      provider: candidate.provider,
      type: candidate.type,
    };
  }

  const provider = providerRegistry.getProviderForMediaType(candidate.type);
  if (!provider) return null;

  try {
    const results = await guardedProviderSearch(candidate.provider, provider, candidate.title);
    if (!results || results.length === 0) return null;

    const exact = results.find((r) => normalizeTitle(r.title) === normalizedTitle);
    const best = exact ?? results[0];

    if (!best?.coverImage) return null;

    return {
      ...best,
      provider: candidate.provider,
      type: candidate.type,
    };
  } catch (error) {
    return null;
  }
}

export async function hydrateCandidates(
  candidates: MediaCandidate[],
  baseResults: MediaResult[] = []
): Promise<MediaResult[]> {
  const hydrated: MediaResult[] = [];

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((candidate) => hydrateCandidate(candidate, baseResults)));
    hydrated.push(...results.filter((r): r is MediaResult => r !== null));
  }

  return dedupeMediaResults(hydrated);
}
