import { providerRegistry } from '../integrations/registry';
import { getGeminiClient } from '../ai/client';
import { buildMediaCandidatePrompt } from '../ai/prompts';
import { mediaCandidatesSchema, MediaCandidate } from '../ai/schemas';
import { MediaResult } from '../integrations/MediaSearchProvider';
import { guardedProviderSearch } from './circuitBreaker';

const CONCURRENCY = 5;

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

export async function generateCandidatesWithAi(query: string): Promise<MediaCandidate[]> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const result = await model.generateContent(buildMediaCandidatePrompt(query));
    const text = result.response.text();

    const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    const candidates = Array.isArray(parsed) ? parsed : parsed.candidates;

    const validated = mediaCandidatesSchema.safeParse(candidates);
    return validated.success ? validated.data : [];
  } catch (error) {
    return [];
  }
}

async function hydrateCandidate(candidate: MediaCandidate): Promise<MediaResult | null> {
  const provider = providerRegistry.getProviderForMediaType(candidate.type);
  if (!provider) return null;

  try {
    const results = await guardedProviderSearch(candidate.provider, provider, candidate.title);
    if (!results || results.length === 0) return null;

    const normalizedTitle = normalizeTitle(candidate.title);
    const exact = results.find((r) => normalizeTitle(r.title) === normalizedTitle);
    const best = exact ?? results[0];

    return {
      ...best,
      provider: candidate.provider,
      type: candidate.type,
    };
  } catch (error) {
    return null;
  }
}

export async function hydrateCandidates(candidates: MediaCandidate[]): Promise<MediaResult[]> {
  const hydrated: MediaResult[] = [];

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(hydrateCandidate));
    hydrated.push(...results.filter((r): r is MediaResult => r !== null));
  }

  return dedupeMediaResults(hydrated);
}
