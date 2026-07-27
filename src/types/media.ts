export const MEDIA_TYPES = ["movie", "tv", "music", "game", "book"] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const SEARCH_MODES = ["title", "vibe"] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

export interface NormalizedMedia {
  mediaType: MediaType;
  externalId: string;
  sourceApi: "tmdb" | "spotify" | "rawg" | "google_books";
  title: string;
  year?: number;
  creators?: string[];
  genres?: string[];
  imageUrl?: string;
  description?: string;
  externalUrl?: string;
}

export interface Recommendation {
  id: string;
  mediaType: MediaType;
  title: string;
  matchReason: string;
  verified: boolean;
  sourceApi?: NormalizedMedia["sourceApi"];
  externalId?: string;
  metadata?: Partial<NormalizedMedia>;
}