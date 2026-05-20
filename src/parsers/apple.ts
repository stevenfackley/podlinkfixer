import type { AppleSource } from "./types";

// Matches:
//   https://podcasts.apple.com/us/podcast/<slug>/id1200361736
//   https://podcasts.apple.com/us/podcast/<slug>/id1200361736?i=1000654321000
//   https://podcasts.apple.com/podcast/id1200361736
//   https://podcasts.apple.com/gb/podcast/id1200361736?i=1000654321000&l=en
const HOST = /^(?:[a-z0-9-]+\.)?podcasts\.apple\.com$/i;
const PATH = /\/(?:id)(\d+)/;

export function parseAppleUrl(u: URL): AppleSource | null {
  if (!HOST.test(u.hostname)) return null;
  const m = u.pathname.match(PATH);
  if (!m) return null;
  const showId = m[1];
  const episodeId = u.searchParams.get("i");
  return {
    platform: "apple",
    showId,
    episodeId: episodeId && /^\d+$/.test(episodeId) ? episodeId : null,
  };
}
