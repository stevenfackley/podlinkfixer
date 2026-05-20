// Resolve a ParsedSource into a CanonicalShow (+ optional CanonicalEpisode) that the
// target builders can use. Apple is the easy path (iTunes ID is canonical). Spotify
// needs a Spotify API lookup for the show title, then a Podcast Index search to recover
// the iTunes ID and feed URL.

import type { ParsedSource, AppleSource, SpotifySource } from "./parsers";
import * as iTunes from "./lookup/itunes";
import * as PI from "./lookup/podcast-index";
import * as Spotify from "./lookup/spotify";
import { titleSimilarity } from "./match/confidence";
import type { CanonicalEpisode, CanonicalShow } from "./targets";

export interface ResolveEnv {
  kv: KVNamespace;
  spotify: Spotify.SpotifyCreds;
  podcastIndex: PI.PICredentials;
}

export interface ResolveResult {
  show: CanonicalShow;
  episode: CanonicalEpisode | null;
}

const FEED_MATCH_MIN = 0.6;

export async function resolveSource(src: ParsedSource, env: ResolveEnv): Promise<ResolveResult | null> {
  switch (src.platform) {
    case "apple":
      return resolveApple(src, env);
    case "spotify":
      return resolveSpotify(src, env);
    case "overcast":
      // If we got an Overcast iTunes-form URL, we already have the iTunes ID
      if (src.kind === "itunes") {
        return resolveApple({ platform: "apple", showId: src.overcastId, episodeId: null }, env);
      }
      return null;
    case "pocketcasts":
      // pca.st URLs don't expose iTunes ID without scraping the page — out of scope for v1
      return null;
  }
}

async function resolveApple(src: AppleSource, env: ResolveEnv): Promise<ResolveResult | null> {
  const show = await iTunes.getAppleShow(src.showId);
  if (!show) return null;

  let piFeed: PI.PIFeed | null = null;
  try {
    piFeed = await PI.feedByItunesId(src.showId, env.podcastIndex);
  } catch {
    // non-fatal — Podcast Index is enhancement, not required for Apple-rooted lookups
  }

  const canonical: CanonicalShow = {
    title: show.collectionName,
    publisher: show.artistName,
    itunesId: src.showId,
    feedUrl: show.feedUrl ?? piFeed?.url ?? null,
    artworkUrl:
      show.artworkUrl600 ?? show.artworkUrl100 ?? piFeed?.artwork ?? piFeed?.image ?? null,
    piFeed: piFeed ?? undefined,
  };

  if (!src.episodeId) return { show: canonical, episode: null };

  const ep = await iTunes.getAppleEpisode(src.episodeId);
  if (!ep) return { show: canonical, episode: null };

  return {
    show: canonical,
    episode: {
      title: ep.trackName,
      publishedAt: ep.releaseDate,
      durationMs: ep.trackTimeMillis,
    },
  };
}

async function resolveSpotify(src: SpotifySource, env: ResolveEnv): Promise<ResolveResult | null> {
  let spotifyShow: Spotify.SpotifyShow | null = null;
  let episode: CanonicalEpisode | null = null;

  if (src.kind === "show") {
    spotifyShow = await Spotify.getShow(src.spotifyId, env.spotify, env.kv);
  } else {
    const sEp = await Spotify.getEpisode(src.spotifyId, env.spotify, env.kv);
    if (!sEp) return null;
    spotifyShow = sEp.show ?? null;
    episode = {
      title: sEp.name,
      publishedAt: sEp.release_date,
      durationMs: sEp.duration_ms,
    };
  }
  if (!spotifyShow) return null;

  // Recover canonical iTunes ID + feed URL via Podcast Index search
  let piFeed: PI.PIFeed | null = null;
  try {
    const candidates = await PI.searchByTerm(spotifyShow.name, env.podcastIndex, 5);
    piFeed = pickBestFeed(candidates, spotifyShow.name, spotifyShow.publisher);
  } catch {
    // non-fatal
  }

  const canonical: CanonicalShow = {
    title: spotifyShow.name,
    publisher: spotifyShow.publisher,
    itunesId: piFeed?.itunesId ? String(piFeed.itunesId) : null,
    feedUrl: piFeed?.url ?? null,
    artworkUrl: spotifyShow.images?.[0]?.url ?? piFeed?.artwork ?? piFeed?.image ?? null,
    piFeed: piFeed ?? undefined,
  };

  return { show: canonical, episode };
}

function pickBestFeed(
  feeds: PI.PIFeed[],
  showName: string,
  publisher?: string,
): PI.PIFeed | null {
  if (!feeds.length) return null;
  let best = feeds[0];
  let bestScore = scoreFeed(best, showName, publisher);
  for (const f of feeds.slice(1)) {
    const s = scoreFeed(f, showName, publisher);
    if (s > bestScore) {
      bestScore = s;
      best = f;
    }
  }
  return bestScore >= FEED_MATCH_MIN ? best : null;
}

function scoreFeed(feed: PI.PIFeed, showName: string, publisher?: string): number {
  const titleSim = titleSimilarity(showName, feed.title);
  if (!publisher) return titleSim;
  const author = feed.author ?? feed.ownerName ?? "";
  const pubSim = author ? titleSimilarity(publisher, author) : 0;
  return titleSim * 0.8 + pubSim * 0.2;
}
