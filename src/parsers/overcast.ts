import type { OvercastSource } from "./types";

// Overcast URLs:
//   https://overcast.fm/itunes1200361736          -> show, by iTunes ID (easy mapping)
//   https://overcast.fm/p<podcastId>-<slug>       -> show, by overcast-internal id
//   https://overcast.fm/+<episodeId>              -> episode, overcast-internal id
const HOST = /^overcast\.fm$/i;

export function parseOvercastUrl(u: URL): OvercastSource | null {
  if (!HOST.test(u.hostname)) return null;
  const path = u.pathname.replace(/^\/+/, "");
  const url = u.toString();
  let m;
  if ((m = path.match(/^itunes(\d+)/i))) {
    return { platform: "overcast", kind: "itunes", overcastId: m[1], overcastUrl: url };
  }
  if ((m = path.match(/^p(\d+)(?:-.*)?$/i))) {
    return { platform: "overcast", kind: "podcast", overcastId: m[1], overcastUrl: url };
  }
  if ((m = path.match(/^\+([A-Za-z0-9]+)/))) {
    return { platform: "overcast", kind: "episode", overcastId: m[1], overcastUrl: url };
  }
  return null;
}
