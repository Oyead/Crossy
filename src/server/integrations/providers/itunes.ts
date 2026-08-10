import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';
import { fetchWithTimeout } from '../fetchWithTimeout';

const ITUNES_API_URL = 'https://itunes.apple.com';

function bigArtwork(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace('100x100bb', '600x600bb');
}

export class ItunesProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    try {
      const url = `${ITUNES_API_URL}/search?term=${encodeURIComponent(query)}&media=music&entity=song,album&limit=20`;
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`iTunes search failed: ${response.status}`);
      }
      const data = await response.json();

      if (!Array.isArray(data.results)) return [];

      return data.results.map((item: any) => this.mapResult(item)).filter(Boolean);
    } catch (error) {
      return [];
    }
  }

  async getDetails(id: string): Promise<MediaResult | null> {
    try {
      const response = await fetchWithTimeout(`${ITUNES_API_URL}/lookup?id=${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error(`iTunes lookup failed: ${response.status}`);
      }
      const data = await response.json();

      if (!Array.isArray(data.results) || data.results.length === 0) return null;
      return this.mapResult(data.results[0]);
    } catch (error) {
      return null;
    }
  }

  private mapResult(item: any): MediaResult | null {
    if (item.wrapperType === 'collection' && item.collectionType !== 'Album') {
      return null;
    }

    const isAlbum = item.wrapperType === 'collection';

    return {
      id: String(isAlbum ? item.collectionId : item.trackId),
      title: isAlbum ? item.collectionName : item.trackName,
      description: `By ${item.artistName || 'Unknown artist'}`,
      releaseDate: item.releaseDate ? item.releaseDate.slice(0, 10) : undefined,
      coverImage: bigArtwork(item.artworkUrl100),
      rating: undefined,
      provider: 'itunes',
      type: 'music',
      creators: item.artistName ? [item.artistName] : undefined,
      genres: item.primaryGenreName ? [item.primaryGenreName] : undefined,
      externalUrl: item.collectionViewUrl || item.trackViewUrl,
    };
  }
}
