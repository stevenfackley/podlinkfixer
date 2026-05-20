import type { TargetBuilder } from "./types";

// Pocket Casts exposes a redirect from iTunes ID to the show page.
// Episode URLs use Pocket Casts internal UUIDs that aren't derivable externally.
export const buildPocketCastsTarget: TargetBuilder = async (show, episode) => {
  if (!show.itunesId) return null;
  const url = `https://pca.st/itunes/${show.itunesId}`;
  if (episode) {
    return {
      platform: "pocketcasts",
      url,
      kind: "show",
      note: "Pocket Casts doesn't expose episode-level cross-platform URLs — opening show page.",
    };
  }
  return { platform: "pocketcasts", url, kind: "show" };
};
