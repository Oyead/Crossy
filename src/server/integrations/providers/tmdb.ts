import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';
import { fetchWithTimeout } from '../fetchWithTimeout';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const MOVIE_GENRES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

const TV_GENRES: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

function genreNames(ids: unknown, mediaType: string): string[] | undefined {
  if (!Array.isArray(ids)) return undefined;
  const map = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES;
  const names = ids
    .map((id) => map[Number(id)])
    .filter((name): name is string => Boolean(name));
  return names.length > 0 ? names : undefined;
}

export class TmdbProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    if (!TMDB_API_KEY) return [];

    try {
      const response = await fetchWithTimeout(`${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`TMDB search failed: ${response.status}`);
      }
      const data = await response.json();

      return data.results
        .filter((item: any) => item.media_type !== 'person')
        .map((item: any) => this.mapToMediaResult(item));
    } catch (error) {
      throw error;
    }
  }

  async getDetails(id: string, type?: string): Promise<MediaResult | null> {
    if (!TMDB_API_KEY) return null;

    try {
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
      genres: Array.isArray(item.genres)
        ? item.genres.map((g: any) => (typeof g === 'string' ? g : g?.name)).filter(Boolean)
        : genreNames(item.genre_ids, mediaType),
      provider: 'tmdb',
      type: mediaType,
    };
  }
}