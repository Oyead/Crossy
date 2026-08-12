import { MediaSearchProvider } from './MediaSearchProvider';
import { TmdbProvider } from './providers/tmdb';
import { ItunesProvider } from './providers/itunes';
import { RawgProvider } from './providers/rawg';
import { OpenLibraryProvider } from './providers/openLibrary';

const MEDIA_TYPE_TO_PROVIDER: Record<string, string> = {
  movie: 'tmdb',
  tv: 'tmdb',
  music: 'itunes',
  book: 'openlibrary',
  game: 'rawg',
};

class ProviderRegistry {
  private providers: Map<string, MediaSearchProvider> = new Map();
  private initialized: boolean = false;

  initialize() {
    if (this.initialized) return;

    this.register('tmdb', new TmdbProvider());
    this.register('itunes', new ItunesProvider());
    this.register('rawg', new RawgProvider());
    this.register('openLibrary', new OpenLibraryProvider());
    this.initialized = true;
  }

  register(name: string, provider: MediaSearchProvider) {
    this.providers.set(name.toLowerCase(), provider);
  }

  get(name: string): MediaSearchProvider | undefined {
    if (!this.initialized) this.initialize();
    return this.providers.get(name.toLowerCase());
  }

  getAll(): MediaSearchProvider[] {
    if (!this.initialized) this.initialize();
    return Array.from(this.providers.values());
  }

  getAllWithNames(): Array<{ name: string; provider: MediaSearchProvider }> {
    if (!this.initialized) this.initialize();
    return Array.from(this.providers.entries()).map(([name, provider]) => ({ name, provider }));
  }

  has(name: string): boolean {
    if (!this.initialized) this.initialize();
    return this.providers.has(name.toLowerCase());
  }

  getProviderForMediaType(mediaType: string): MediaSearchProvider | undefined {
    if (!this.initialized) this.initialize();
    const providerName = MEDIA_TYPE_TO_PROVIDER[mediaType.toLowerCase()];
    return providerName ? this.providers.get(providerName) : undefined;
  }
}

export const providerRegistry = new ProviderRegistry();

// Auto-initialize on import
providerRegistry.initialize();

// Helper function to register a provider (for dynamic registration)
export function registerProvider(name: string, provider: MediaSearchProvider) {
  providerRegistry.register(name, provider);
}

// Map a media type (movie, tv, music, book, game) to its provider
export function providerForMediaType(mediaType: string): MediaSearchProvider | undefined {
  return providerRegistry.getProviderForMediaType(mediaType);
}

export default providerRegistry;
