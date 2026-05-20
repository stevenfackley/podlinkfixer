import type { TargetBuilder } from "./types";

// Overcast: show URL via iTunes ID redirect. No external episode URL scheme.
export const buildOvercastTarget: TargetBuilder = async (show, episode) => {
  if (!show.itunesId) return null;
  const url = `https://overcast.fm/itunes${show.itunesId}`;
  if (episode) {
    return {
      platform: "overcast",
      url,
      kind: "show",
      note: "Overcast doesn't expose episode-level cross-platform URLs — opening show page.",
    };
  }
  return { platform: "overcast", url, kind: "show" };
};
