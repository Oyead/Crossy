import { providerRegistry } from '../integrations/registry';
import { getGeminiClient } from '../ai/client';
import { buildMediaRecommendationPrompt } from '../ai/prompts';
import { redis } from '../../lib/redis';

const CACHE_TTL = 60 * 60; // 1 hour

function cacheKey(query: string): string {
  return `search:${query.trim().toLowerCase()}`;
}

export async function processMediaQuery(query: string): Promise<any[]> {
  const key = cacheKey(query);

  try {
    const cached = await redis.get<string>(key);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    // Cache errors should never block a search
  }

  try {
    const allProviders = providerRegistry.getAll();
    const searchPromises = allProviders.map(provider =>
      provider.search(query).catch(() => [])
    );

    const providerResults = await Promise.all(searchPromises);

    const allResults = providerResults
      .flat()
      .filter((result, index, self) =>
        index === self.findIndex(
          r => r.id === result.id && r.provider === result.provider
        )
      );

    if (allResults.length === 0) {
      return [];
    }

    const results = await rankWithAi(query, allResults);
    await cacheResults(key, results);
    return results;
  } catch (error) {
    const allProviders = providerRegistry.getAll();
    const searchPromises = allProviders.map(provider =>
      provider.search(query).catch(() => [])
    );
    const results = await Promise.all(searchPromises);
    return results.flat();
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
    description: String(r.description || '').slice(0, 200),
  }));
  const recommendationPrompt = buildMediaRecommendationPrompt(query, compact);

  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(recommendationPrompt);
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
    return limitedResults;
  }
}

async function cacheResults(key: string, results: any[]): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(results), { ex: CACHE_TTL });
  } catch (error) {
    // Ignore cache write failures
  }
}
