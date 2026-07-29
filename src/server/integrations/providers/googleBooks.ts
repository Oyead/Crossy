import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';

const GOOGLE_BOOKS_API_URL = 'https://www.googleapis.com/books/v1/volumes';

export class GoogleBooksProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    try {
      const response = await fetch(`${GOOGLE_BOOKS_API_URL}?q=${encodeURIComponent(query)}&maxResults=10`);
      if (!response.ok) {
        throw new Error(`Google Books search failed: ${response.status}`);
      }
      const data = await response.json();

      if (!data.items) return [];

      return data.items.map((item: any) => this.mapVolumeToMediaResult(item));
    } catch (error) {
      return [];
    }
  }

  async getDetails(id: string): Promise<MediaResult | null> {
    try {
      const response = await fetch(`${GOOGLE_BOOKS_API_URL}/${id}`);
      if (!response.ok) {
        throw new Error(`Google Books get details failed: ${response.status}`);
      }
      const data = await response.json();
      return this.mapVolumeToMediaResult(data);
    } catch (error) {
      return null;
    }
  }

  private mapVolumeToMediaResult(item: any): MediaResult {
    const volumeInfo = item.volumeInfo || {};
    const publishedDate = volumeInfo.publishedDate || '';
    const releaseDate = publishedDate.split('-')[0] || undefined;

    return {
      id: item.id,
      title: volumeInfo.title || 'Unknown Title',
      description: volumeInfo.description || '',
      releaseDate,
      coverImage: volumeInfo.imageLinks?.thumbnail,
      rating: volumeInfo.averageRating ? Number(volumeInfo.averageRating) : undefined,
      provider: 'googleBooks',
      type: 'book',
      ...item
    };
  }
}