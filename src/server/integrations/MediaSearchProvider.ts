export interface MediaSearchProvider {
  search(query: string): Promise<MediaResult[]>;

  getDetails(id: string, type?: string): Promise<MediaResult | null>;
}

export interface MediaResult {
  id: string;
  title: string;
  description?: string;
  releaseDate?: string;
  coverImage?: string;
  rating?: number;
  provider: string;
  type: 'movie' | 'tv' | 'music' | 'book' | 'game';
  [key: string]: any;
}