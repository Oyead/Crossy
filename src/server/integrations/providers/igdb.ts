import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';

const IGDB_CLIENT_ID = process.env.IGDB_CLIENT_ID;
const IGDB_CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const IGDB_TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const IGDB_API_URL = 'https://api.igdb.com/v4';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getIgdbAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!IGDB_CLIENT_ID || !IGDB_CLIENT_SECRET) {
    throw new Error('IGDB client credentials not configured');
  }

  const response = await fetch(IGDB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: IGDB_CLIENT_ID,
      client_secret: IGDB_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch IGDB token: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  return accessToken;
}

export class IgdbProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    try {
      const token = await getIgdbAccessToken();
      const body = `search "${query}"; fields name, summary, first_release_date, cover.url, rating; limit 10;`;

      const response = await fetch(`${IGDB_API_URL}/games`, {
        method: 'POST',
        headers: {
          'Client-ID': IGDB_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`IGDB search failed: ${response.status}`);
      }

      const data = await response.json();
      return data.map((game: any) => this.mapGameToMediaResult(game));
    } catch (error) {
      return [];
    }
  }

  async getDetails(id: string): Promise<MediaResult | null> {
    try {
      const token = await getIgdbAccessToken();
      const body = `fields name, summary, first_release_date, cover.url, rating; where id = ${id};`;

      const response = await fetch(`${IGDB_API_URL}/games`, {
        method: 'POST',
        headers: {
          'Client-ID': IGDB_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`IGDB get details failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.length === 0) return null;
      return this.mapGameToMediaResult(data[0]);
    } catch (error) {
      return null;
    }
  }

  private mapGameToMediaResult(game: any): MediaResult {
    const releaseDate = game.first_release_date
      ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
      : undefined;

    return {
      id: String(game.id),
      title: game.name,
      description: game.summary || '',
      releaseDate,
      coverImage: game.cover?.url
        ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}`
        : undefined,
      rating: game.rating ? Math.round(game.rating) : undefined,
      provider: 'igdb',
      type: 'game',
      ...game
    };
  }
}