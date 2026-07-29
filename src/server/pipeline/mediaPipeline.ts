import { providerRegistry } from '../integrations/registry';
import { getAnthropicClient } from '../ai/client';
import {
  buildMediaSearchPrompt,
  buildMediaRecommendationPrompt,
  mediaSearchResultsSchema
} from '../ai/prompts';
import { z } from 'zod';

export async function processMediaQuery(query: string): Promise<any[]> {
  try {
    const allProviders = providerRegistry.getAll();
    const searchPromises = allProviders.map(provider =>
      provider.search(query).catch(err => {
        return [];
      })
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

    const anthropic = getAnthropicClient();

    const limitedResults = allResults.slice(0, 20);

    const searchPrompt = buildMediaSearchPrompt(query);
    const recommendationPrompt = buildMediaRecommendationPrompt(
      query,
      limitedResults
    );

    const msg = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: recommendationPrompt,
        },
      ],
    });

    const aiResponse = msg.content[0].type === 'text'
      ? msg.content[0].text
      : '';

    let recommendations: any[] = [];
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
          recommendations = parsed.recommendations;
        } else if (Array.isArray(parsed)) {
          recommendations = parsed;
        }
      }
    } catch (e) {
      return limitedResults;
    }

    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec: any) => {
        try {
          const provider = providerRegistry.get(rec.provider);
          if (provider) {
            const details = await provider.getDetails(rec.mediaId);
            return details ?? { ...rec, error: 'Details not found' };
          }
          return rec;
        } catch (err) {
          return { ...rec, error: 'Failed to fetch details' };
        }
      })
    );

    return enrichedRecommendations;
  } catch (error) {
    const allProviders = providerRegistry.getAll();
    const searchPromises = allProviders.map(provider =>
      provider.search(query).catch(() => [])
    );
    const results = await Promise.all(searchPromises);
    return results.flat();
  }
}