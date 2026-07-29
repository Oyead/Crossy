import { MediaSearchProvider, MediaResult } from '../MediaSearchProvider';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

async function getSpotifyAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify client credentials not configured');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: SPOTIFY_CLIENT_ID,
      client_secret: SPOTIFY_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Spotify token: ${response.status}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

  return accessToken;
}

export class SpotifyProvider implements MediaSearchProvider {
  async search(query: string): Promise<MediaResult[]> {
    try {
      const token = await getSpotifyAccessToken();
      const response = await fetch(`${SPOTIFY_API_URL}/search?q=${encodeURIComponent(query)}&type=track,album,artist&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Spotify search failed: ${response.status}`);
      }

      const data = await response.json();
      const results: MediaResult[] = [];

      if (data.tracks?.items) {
        for (const track of data.tracks.items) {
          results.push(this.mapTrackToMediaResult(track));
        }
      }

      if (data.albums?.items) {
        for (const album of data.albums.items) {
          results.push(this.mapAlbumToMediaResult(album));
        }
      }

      return results;
    } catch (error) {
      return [];
    }
  }

  async getDetails(id: string): Promise<MediaResult | null> {
    try {
      const token = await getSpotifyAccessToken();
      let response = await fetch(`${SPOTIFY_API_URL}/tracks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const track = await response.json();
        return this.mapTrackToMediaResult(track);
      }

      response = await fetch(`${SPOTIFY_API_URL}/albums/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const album = await response.json();
        return this.mapAlbumToMediaResult(album);
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  private mapTrackToMediaResult(track: any): MediaResult {
    return {
      id: track.id,
      title: track.name,
      description: `By ${track.artists.map((a: any) => a.name).join(', ')}`,
      releaseDate: track.album?.release_date,
      coverImage: track.album?.images?.[0]?.url,
      rating: undefined,
      provider: 'spotify',
      type: 'music',
      ...track
    };
  }

  private mapAlbumToMediaResult(album: any): MediaResult {
    return {
      id: album.id,
      title: album.name,
      description: `By ${album.artists.map((a: any) => a.name).join(', ')}`,
      releaseDate: album.release_date,
      coverImage: album.images?.[0]?.url,
      rating: undefined,
      provider: 'spotify',
      type: 'music',
      ...album
    };
  }
}