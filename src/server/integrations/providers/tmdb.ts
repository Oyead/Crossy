import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';
import { fetchWithTimeout } from '../fetchWithTimeout';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export class TmdbProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    if (!TMDB_API_KEY) return [];

    try {
      const response = await fetchWithTimeout(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`TMDB search failed: ${response.status}`);
      }
      const data = await response.json();

      return data.results.map((item: any) => this.mapToMediaResult(item));
    } catch (error) {
      return [];
    }
  }

  async getDetails(id: string, type?: string): Promise<MediaResult | null> {
    if (!TMDB_API_KEY) return null;

    try {
      // TMDB ids collide across namespaces, so when the media type is known
      // (movie vs tv) fetch from the correct endpoint directly.
      if (type === 'tv') {
        const tvResponse = await fetchWithTimeout(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`);
        if (!tvResponse.ok) return null;
        return this.mapToMediaResult(await tvResponse.json(), 'tv');
      }

      if (type === 'movie') {
        const movieResponse = await fetchWithTimeout(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`);
        if (!movieResponse.ok) return null;
        return this.mapToMediaResult(await movieResponse.json(), 'movie');
      }

      const movieResponse = await fetchWithTimeout(`${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}`);
      if (movieResponse.ok) {
        return this.mapToMediaResult(await movieResponse.json(), 'movie');
      }

      const tvResponse = await fetchWithTimeout(`${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}`);
      if (tvResponse.ok) {
        return this.mapToMediaResult(await tvResponse.json(), 'tv');
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private mapToMediaResult(item: any, type?: string): MediaResult {
    let mediaType: MediaResult['type'] = 'movie';
    if (item.media_type) {
      switch (item.media_type) {
        case 'movie':
          mediaType = 'movie';
          break;
        case 'tv':
          mediaType = 'tv';
          break;
        default:
          mediaType = 'movie';
      }
    } else if (type) {
      mediaType = type as MediaResult['type'];
    }

    return {
      ...item,
      id: String(item.id),
      title: item.title || item.name || 'Unknown Title',
      description: item.overview || item.description || '',
      releaseDate: item.release_date || item.first_air_date || undefined,
      coverImage: item.poster_path
        ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
        : undefined,
      rating: item.vote_average ? Number(item.vote_average) : undefined,
      provider: 'tmdb',
      type: mediaType,
    };
  }
}