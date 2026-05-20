import type { SpotifySource } from "./types";

// Matches:
//   https://open.spotify.com/show/<id>
//   https://open.spotify.com/episode/<id>
//   https://open.spotify.com/show/<id>?si=abc123
//   https://open.spotify.com/<lang>/show/<id>    (older locale-prefixed form)
const HOST = /^(?:open|play)\.spotify\.com$/i;
const PATH = /(?:^|\/)(show|episode)\/([A-Za-z0-9]+)/;

export function parseSpotifyUrl(u: URL): SpotifySource | null {
  if (!HOST.test(u.hostname)) return null;
  const m = u.pathname.match(PATH);
  if (!m) return null;
  return {
    platform: "spotify",
    kind: m[1] as "show" | "episode",
    spotifyId: m[2],
  };
}
