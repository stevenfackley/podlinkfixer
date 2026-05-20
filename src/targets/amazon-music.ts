import type { TargetBuilder } from "./types";

// Amazon Music has no public podcast catalog API for ID-based mapping.
// Best we can do is deep-link a search.
export const buildAmazonMusicTarget: TargetBuilder = async (show, episode) => {
  const q = episode ? `${show.title} ${episode.title}` : show.title;
  return {
    platform: "amazon_music",
    url: `https://music.amazon.com/search/${encodeURIComponent(q)}`,
    kind: "search",
    note: "Best-effort search — Amazon Music has no public podcast mapping API.",
  };
};
