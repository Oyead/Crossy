import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';
import { fetchWithTimeout } from '../fetchWithTimeout';

const OPEN_LIBRARY_URL = 'https://openlibrary.org';

function coverImage(coverId?: number): string | undefined {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : undefined;
}

function extractDescription(doc: any): string {
  const description = doc.description;
  if (typeof description === 'string') return description;
  if (description && typeof description.value === 'string') return description.value;
  return doc.subtitle || '';
}

async function fetchAuthorNames(authorRefs: any[]): Promise<string[]> {
  const keys = (Array.isArray(authorRefs) ? authorRefs : [])
    .map((entry: any) => entry?.author?.key ?? entry?.key)
    .filter((key: any): key is string => typeof key === 'string')
    .slice(0, 3);

  const names = await Promise.all(
    keys.map(async (key: string) => {
      try {
        const response = await fetchWithTimeout(`${OPEN_LIBRARY_URL}${key}.json`, {}, 3000);
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data.name === 'string' ? data.name : null;
      } catch {
        return null;
      }
    })
  );

  return names.filter((name): name is string => Boolean(name));
}

export class OpenLibraryProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    try {
      const url = `${OPEN_LIBRARY_URL}/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,first_publish_year,cover_i,subtitle`;
      const response = await fetchWithTimeout(url, {}, 5000);
      if (!response.ok) {
        throw new Error(`Open Library search failed: ${response.status}`);
      }
      const data = await response.json();

      if (!Array.isArray(data.docs)) return [];

      return data.docs.map((doc: any) => this.mapDocToMediaResult(doc));
    } catch (error) {
      throw error;
    }
  }

  async getDetails(id: string): Promise<MediaResult | null> {
    try {
      const response = await fetchWithTimeout(`${OPEN_LIBRARY_URL}${id}.json`);
      if (!response.ok) {
        throw new Error(`Open Library get details failed: ${response.status}`);
      }
      const data = await response.json();
      const creators = await fetchAuthorNames(data.authors);

      return {
        id,
        title: data.title || 'Unknown Title',
        description: extractDescription(data),
        releaseDate: data.first_publish_date || data.created?.value?.slice(0, 4) || undefined,
        coverImage: coverImage(data.covers?.[0]),
        rating: undefined,
        provider: 'openLibrary',
        type: 'book',
        creators,
        genres: data.subjects?.slice(0, 8) ?? [],
        externalUrl: `${OPEN_LIBRARY_URL}${id}`,
      };
    } catch (error) {
      return null;
    }
  }

  private mapDocToMediaResult(doc: any): MediaResult {
    return {
      id: doc.key,
      title: doc.title || 'Unknown Title',
      description: doc.subtitle || '',
      releaseDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
      coverImage: coverImage(doc.cover_i),
      rating: undefined,
      provider: 'openLibrary',
      type: 'book',
      creators: Array.isArray(doc.author_name) ? doc.author_name : [],
      externalUrl: `${OPEN_LIBRARY_URL}${doc.key}`,
    };
  }
}
