import { z } from 'zod';

export const mediaSearchResultSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  releaseDate: z.string().optional(),
  coverImage: z.string().url().optional(),
  rating: z.number().min(0).max(10).optional(),
  provider: z.enum(['tmdb', 'itunes', 'rawg', 'openLibrary']),
  type: z.enum(['movie', 'tv', 'music', 'book', 'game']),
});

export const mediaSearchResultsSchema = z.array(mediaSearchResultSchema);

export const mediaRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      index: z.number().int().min(0),
      reason: z.string(),
      confidence: z.number().min(0).max(1),
    })
  ),
});

export const mediaSummarySchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  audience: z.string().optional(),
});

export type MediaSearchResult = z.infer<typeof mediaSearchResultSchema>;
export type MediaRecommendation = z.infer<typeof mediaRecommendationSchema>['recommendations'][0];
export type MediaSummary = z.infer<typeof mediaSummarySchema>;