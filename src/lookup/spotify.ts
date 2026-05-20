// Spotify Web API client — Client Credentials flow (search-only, no user context).
// Token is cached in KV with a short TTL so we don't re-auth on every request.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";
const KV_TOKEN_KEY = "spotify:token";
const MARKET = "US"; // Spotify shows/episodes vary by market; pin to one for consistency

export interface SpotifyCreds {
  clientId: string;
  clientSecret: string;
}

export interface SpotifyShow {
  id: string;
  name: string;
  publisher: string;
  description?: string;
  external_urls: { spotify: string };
  images?: { url: string; height?: number; width?: number }[];
  total_episodes?: number;
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  description?: string;
  release_date: string;       // YYYY-MM-DD (or YYYY/YYYY-MM depending on precision)
  release_date_precision: "day" | "month" | "year";
  duration_ms: number;
  external_urls: { spotify: string };
  images?: { url: string }[];
  show?: SpotifyShow;
}

interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
}

async function fetchNewToken(creds: SpotifyCreds): Promise<{ token: string; expiresIn: number }> {
  const basic = btoa(`${creds.clientId}:${creds.clientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Spotify token request failed: ${res.status}`);
  const data = (await res.json()) as TokenResponse;
  return { token: data.access_token, expiresIn: data.expires_in };
}

export async function getAccessToken(creds: SpotifyCreds, kv: KVNamespace): Promise<string> {
  const cached = await kv.get(KV_TOKEN_KEY);
  if (cached) return cached;
  const { token, expiresIn } = await fetchNewToken(creds);
  // Cache slightly less than Spotify's stated expiry to avoid edge-case expiry mid-flight
  const ttl = Math.max(60, expiresIn - 120);
  await kv.put(KV_TOKEN_KEY, token, { expirationTtl: ttl });
  return token;
}

async function spotifyGet<T>(path: string, token: string): Promise<T | null> {
  const url = new URL(API + path);
  if (!url.searchParams.has("market")) url.searchParams.set("market", MARKET);
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Spotify ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function getShow(id: string, creds: SpotifyCreds, kv: KVNamespace): Promise<SpotifyShow | null> {
  const token = await getAccessToken(creds, kv);
  return spotifyGet<SpotifyShow>(`/shows/${id}`, token);
}

export async function getEpisode(
  id: string,
  creds: SpotifyCreds,
  kv: KVNamespace,
): Promise<SpotifyEpisode | null> {
  const token = await getAccessToken(creds, kv);
  return spotifyGet<SpotifyEpisode>(`/episodes/${id}`, token);
}

export async function getShowEpisodes(
  showId: string,
  creds: SpotifyCreds,
  kv: KVNamespace,
  limit = 50,
): Promise<SpotifyEpisode[]> {
  const token = await getAccessToken(creds, kv);
  const data = await spotifyGet<{ items: SpotifyEpisode[] }>(
    `/shows/${showId}/episodes?limit=${limit}`,
    token,
  );
  return data?.items ?? [];
}

export async function searchShows(
  q: string,
  creds: SpotifyCreds,
  kv: KVNamespace,
  limit = 5,
): Promise<SpotifyShow[]> {
  const token = await getAccessToken(creds, kv);
  const data = await spotifyGet<{ shows: { items: SpotifyShow[] } }>(
    `/search?type=show&limit=${limit}&q=${encodeURIComponent(q)}`,
    token,
  );
  return data?.shows?.items ?? [];
}
