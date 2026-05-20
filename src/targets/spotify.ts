import { getShowEpisodes, searchShows } from "../lookup/spotify";
import { bestEpisodeMatch } from "../match/episode";
import { titleSimilarity } from "../match/confidence";
import type { TargetBuilder } from "./types";

const SHOW_TITLE_MIN = 0.6;

export const buildSpotifyTarget: TargetBuilder = async (show, episode, env) => {
  // Search Spotify for the show by title and pick the best name match
  const candidates = await searchShows(show.title, env.spotify, env.kv, 5);
  if (!candidates.length) return null;
  let bestShow = candidates[0];
  let bestSim = titleSimilarity(show.title, bestShow.name);
  for (const c of candidates.slice(1)) {
    const sim = titleSimilarity(show.title, c.name);
    if (sim > bestSim) {
      bestSim = sim;
      bestShow = c;
    }
  }
  if (bestSim < SHOW_TITLE_MIN) return null;

  if (!episode) {
    return {
      platform: "spotify",
      url: bestShow.external_urls.spotify,
      kind: "show",
    };
  }

  // Look for a matching episode within the show
  try {
    const episodes = await getShowEpisodes(bestShow.id, env.spotify, env.kv, 50);
    const match = bestEpisodeMatch(
      { title: episode.title, publishedAt: episode.publishedAt },
      episodes.map((e) => ({
        title: e.name,
        publishedAt: e.release_date,
        payload: e,
      })),
    );
    if (match) {
      return {
        platform: "spotify",
        url: match.payload.external_urls.spotify,
        kind: "episode",
        confidence: match.confidence,
      };
    }
  } catch {
    // fall through
  }

  return {
    platform: "spotify",
    url: bestShow.external_urls.spotify,
    kind: "show",
    note: "Episode-level match not found on Spotify — opening show page.",
  };
};
