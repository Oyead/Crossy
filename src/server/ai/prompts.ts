import { MediaSearchResult } from './schemas';

export function buildMediaSearchPrompt(query: string): string {
  return `
You are a media search assistant. Given the user's query: "${query}",
search across multiple media types (movies, TV shows, music, books, games)
and provide relevant results.

For each result, include:
- Title
- Description (brief)
- Release date (if applicable)
- Cover image URL (if available)
- Rating (if available, on a scale of 0-10)
- Provider (which service the result came from: tmdb, itunes, rawg, or openLibrary)
- Type (movie, tv, music, book, or game)

Format your response as a JSON array of objects with these fields.
Only include results that are highly relevant to the query.
If no results are found, return an empty array.

User query: "${query}"
`;
}

export function buildMediaRecommendationPrompt(
  userPreferences: string,
  availableMedia: MediaSearchResult[]
): string {
  return `
You are a media recommendation engine. Based on the user's preferences:
"${userPreferences}"

Here is a numbered list of available media found by searching multiple APIs
(movies/TV from tmdb, music from itunes, games from rawg, books from openLibrary):
${JSON.stringify(availableMedia, null, 2)}

Select the 5-10 best matches from this list. For each recommendation, include:
- index: The position (0-based) of the media in the numbered list above
- reason: Why you're recommending this media to the user
- confidence: A number between 0 and 1 indicating how confident you are in this recommendation

Only reference items that actually exist in the list by their correct index.
Format your response as a JSON object with a "recommendations" array containing these objects.
`;
}

export function buildMediaSummaryPrompt(media: MediaSearchResult): string {
  return `
You are a media summarizer. Given the following media details:
${JSON.stringify(media, null, 2)}

Provide a concise summary of this media, including:
- A brief overview/summary (2-3 sentences)
- Key points or highlights (array of strings)
- Target audience (if applicable, e.g., "children", "teenagers", "adults")

Format your response as a JSON object with these fields.
`;
}

export function buildMatchExplanationPrompt(
  query: string,
  media: MediaSearchResult
): string {
  return `
Explain why the following media matches the user's query: "${query}"

Media details:
${JSON.stringify(media, null, 2)}

Provide a brief explanation (1-2 sentences) focusing on relevance.
`;
}