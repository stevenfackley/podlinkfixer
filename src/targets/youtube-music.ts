import type { TargetBuilder } from "./types";

// YouTube Music cross-platform mapping is unreliable: there's no public catalog API
// that maps podcasts by RSS GUID or iTunes ID. We return a search URL — best effort.
export const buildYouTubeMusicTarget: TargetBuilder = async (show, episode) => {
  const q = episode ? `${show.title} ${episode.title}` : `${show.title} podcast`;
  return {
    platform: "youtube_music",
    url: `https://music.youtube.com/search?q=${encodeURIComponent(q)}`,
    kind: "search",
    note: "Best-effort search — YouTube Music has no public podcast mapping API.",
  };
};
