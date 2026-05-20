import type { TargetBuilder } from "./types";

// Audible has limited podcast inventory and no mapping API. Search-only.
export const buildAudibleTarget: TargetBuilder = async (show, episode) => {
  const q = episode ? `${show.title} ${episode.title}` : show.title;
  return {
    platform: "audible",
    url: `https://www.audible.com/search?keywords=${encodeURIComponent(q)}`,
    kind: "search",
    note: "Best-effort search — Audible has no public podcast mapping API.",
  };
};
