import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';
import { fetchWithTimeout } from '../fetchWithTimeout';

const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_API_URL = 'https://api.rawg.io/api';

export class RawgProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    if (!RAWG_API_KEY) return [];

    try {
      const url = `${RAWG_API_URL}/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}&page_size=10`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`RAWG search failed: ${response.status}`);
      }
      const data = await response.json();

      if (!Array.isArray(data.results)) return [];

      return data.results.map((game: any) => this.mapGameToMediaResult(game));
    } catch (error) {
      throw error;
    }
  }

  async getDetails(id: string): Promise<MediaResult | null> {
    if (!RAWG_API_KEY) return null;

    try {
      const response = await fetchWithTimeout(`${RAWG_API_URL}/games/${id}?key=${RAWG_API_KEY}`);
      if (!response.ok) {
        throw new Error(`RAWG get details failed: ${response.status}`);
      }
      const data = await response.json();
      return this.mapGameToMediaResult(data);
    } catch (error) {
      return null;
    }
  }

  private mapGameToMediaResult(game: any): MediaResult {
    const rating =
      typeof game.rating === 'number' && game.rating_top
        ? Math.round((game.rating / game.rating_top) * 10)
        : typeof game.metacritic === 'number'
          ? Math.round(game.metacritic / 10)
          : undefined;

    return {
      ...game,
      id: String(game.id),
      title: game.name || 'Unknown Title',
      description: game.description_raw || game.description || '',
      releaseDate: game.released || undefined,
      coverImage: game.background_image || undefined,
      rating,
      provider: 'rawg',
      type: 'game',
      genres: game.genres?.map((g: any) => g.name) ?? [],
    };
  }
}
