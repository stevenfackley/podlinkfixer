import type { TargetBuilder } from "./types";

// Castro: show URL via iTunes ID. No reliable episode URLs.
export const buildCastroTarget: TargetBuilder = async (show, episode) => {
  if (!show.itunesId) return null;
  const url = `https://castro.fm/itunes/${show.itunesId}`;
  if (episode) {
    return {
      platform: "castro",
      url,
      kind: "show",
      note: "Castro doesn't expose episode-level cross-platform URLs — opening show page.",
    };
  }
  return { platform: "castro", url, kind: "show" };
};
