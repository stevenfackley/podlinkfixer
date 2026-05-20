import { buildAppleUrl, getAppleShowEpisodes } from "../lookup/itunes";
import { bestEpisodeMatch } from "../match/episode";
import type { TargetBuilder } from "./types";

export const buildAppleTarget: TargetBuilder = async (show, episode) => {
  if (!show.itunesId) return null;

  if (!episode) {
    return {
      platform: "apple",
      url: buildAppleUrl(show.itunesId),
      kind: "show",
    };
  }

  // Try to find the matching episode trackId via the iTunes Search API
  try {
    const episodes = await getAppleShowEpisodes(show.itunesId, 100);
    const match = bestEpisodeMatch(
      { title: episode.title, publishedAt: episode.publishedAt },
      episodes.map((e) => ({
        title: e.trackName,
        publishedAt: e.releaseDate,
        payload: e.trackId,
      })),
    );
    if (match) {
      return {
        platform: "apple",
        url: buildAppleUrl(show.itunesId, String(match.payload)),
        kind: "episode",
        confidence: match.confidence,
      };
    }
  } catch {
    // fall through to show-level
  }

  return {
    platform: "apple",
    url: buildAppleUrl(show.itunesId),
    kind: "show",
    note: "Episode-level match not found on Apple Podcasts — opening show page.",
  };
};
