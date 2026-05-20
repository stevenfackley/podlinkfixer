// iTunes Search API — public, no auth. Used for:
//   - Resolving Apple show ID -> show metadata + RSS feed URL (handy for Podcast Index byfeedurl fallback)
//   - Resolving an Apple episode trackId -> title + releaseDate + show iTunes ID (for episode matching)

const BASE = "https://itunes.apple.com/lookup";

export interface ITunesShow {
  collectionId: number;        // iTunes show ID
  collectionName: string;      // show title
  artistName: string;          // publisher
  feedUrl?: string;            // RSS feed URL — gold for cross-platform matching
  artworkUrl600?: string;
  artworkUrl100?: string;
  trackCount?: number;
}

export interface ITunesEpisode {
  kind: "podcast-episode";
  trackId: number;             // episode iTunes ID
  collectionId: number;        // show iTunes ID
  trackName: string;           // episode title
  releaseDate: string;         // ISO 8601
  description?: string;
  trackTimeMillis?: number;
  artworkUrl600?: string;
}

interface LookupResponse<T> {
  resultCount: number;
  results: T[];
}

async function lookup<T>(params: Record<string, string>): Promise<T[]> {
  const url = new URL(BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { cf: { cacheTtl: 3600 } as any });
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`);
  const data = (await res.json()) as LookupResponse<T>;
  return data.results ?? [];
}

export async function getAppleShow(showId: string): Promise<ITunesShow | null> {
  const results = await lookup<ITunesShow>({ id: showId, entity: "podcast" });
  return results[0] ?? null;
}

export async function getAppleEpisode(episodeId: string): Promise<ITunesEpisode | null> {
  // entity=podcastEpisode returns the episode by trackId
  const results = await lookup<ITunesEpisode>({ id: episodeId, entity: "podcastEpisode" });
  // The result with kind === "podcast-episode" is the episode; sometimes the show is also returned.
  return results.find((r: any) => r.kind === "podcast-episode") ?? results[0] ?? null;
}

export async function getAppleShowEpisodes(showId: string, limit = 50): Promise<ITunesEpisode[]> {
  // Returns 1 show row + up to `limit` episodes
  const results = await lookup<any>({
    id: showId,
    entity: "podcastEpisode",
    limit: String(limit),
  });
  return results.filter((r) => r.kind === "podcast-episode") as ITunesEpisode[];
}

// Build the standard Apple Podcasts URL for a show (and optional episode)
export function buildAppleUrl(showId: string, episodeId?: string | null, country = "us"): string {
  const base = `https://podcasts.apple.com/${country}/podcast/id${showId}`;
  return episodeId ? `${base}?i=${episodeId}` : base;
}
