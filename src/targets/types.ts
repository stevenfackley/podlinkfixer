import type { PIFeed } from "../lookup/podcast-index";
import type { PICredentials } from "../lookup/podcast-index";
import type { SpotifyCreds } from "../lookup/spotify";

export type TargetPlatform =
  | "apple"
  | "spotify"
  | "youtube_music"
  | "pocketcasts"
  | "overcast"
  | "castro"
  | "amazon_music"
  | "audible";

export const TARGET_LABELS: Record<TargetPlatform, string> = {
  apple: "Apple Podcasts",
  spotify: "Spotify",
  youtube_music: "YouTube Music",
  pocketcasts: "Pocket Casts",
  overcast: "Overcast",
  castro: "Castro",
  amazon_music: "Amazon Music",
  audible: "Audible",
};

export interface CanonicalShow {
  title: string;
  publisher?: string | null;
  itunesId: string | null;
  feedUrl: string | null;
  artworkUrl: string | null;
  piFeed?: PIFeed;
}

export interface CanonicalEpisode {
  title: string;
  publishedAt: string; // ISO date
  durationMs?: number | null;
}

export interface TargetEnv {
  kv: KVNamespace;
  spotify: SpotifyCreds;
  podcastIndex: PICredentials;
}

export interface TargetResult {
  platform: TargetPlatform;
  url: string;
  kind: "show" | "episode" | "search";
  /** 0..1 confidence for episode-level matches (Spotify, Apple). Absent for show/search URLs. */
  confidence?: number;
  /** Optional UI hint, e.g. "Episode not found — opening show page" or "Best-effort search link". */
  note?: string;
}

export type TargetBuilder = (
  show: CanonicalShow,
  episode: CanonicalEpisode | null,
  env: TargetEnv,
) => Promise<TargetResult | null>;
