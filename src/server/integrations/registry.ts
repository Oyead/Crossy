import { MediaSearchProvider } from './MediaSearchProvider';
import { TmdbProvider } from './providers/tmdb';
import { SpotifyProvider } from './providers/spotify';
import { IgdbProvider } from './providers/igdb';
import { GoogleBooksProvider } from './providers/googleBooks';

class ProviderRegistry {
  private providers: Map<string, MediaSearchProvider> = new Map();
  private initialized: boolean = false;

  initialize() {
    if (this.initialized) return;

    this.register('tmdb', new TmdbProvider());
    this.register('spotify', new SpotifyProvider());
    this.register('igdb', new IgdbProvider());
    this.register('googleBooks', new GoogleBooksProvider());

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

  has(name: string): boolean {
    if (!this.initialized) this.initialize();
    return this.providers.has(name.toLowerCase());
  }
}

export const providerRegistry = new ProviderRegistry();

// Auto-initialize on import
providerRegistry.initialize();

// Helper function to register a provider (for dynamic registration)
export function registerProvider(name: string, provider: MediaSearchProvider) {
  providerRegistry.register(name, provider);
}

export default providerRegistry;