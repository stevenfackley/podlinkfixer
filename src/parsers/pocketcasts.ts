import type { PocketCastsSource } from "./types";

// Pocket Casts share URLs:
//   https://pca.st/podcast/<uuid>           -> show
//   https://pca.st/episode/<uuid>           -> episode
//   https://pca.st/<short-id>               -> short link, kind unknown until we resolve it
//   https://pocketcasts.com/podcasts/<uuid> -> web app show URL
const PCA_HOST = /^pca\.st$/i;
const PC_HOST = /^(?:www\.)?pocketcasts\.com$/i;

export function parsePocketCastsUrl(u: URL): PocketCastsSource | null {
  const url = u.toString();
  if (PCA_HOST.test(u.hostname)) {
    const path = u.pathname.replace(/^\/+|\/+$/g, "");
    const parts = path.split("/");
    if (parts[0] === "podcast" && parts[1]) {
      return { platform: "pocketcasts", kind: "show", pcaId: parts[1], pcaUrl: url };
    }
    if (parts[0] === "episode" && parts[1]) {
      return { platform: "pocketcasts", kind: "episode", pcaId: parts[1], pcaUrl: url };
    }
    if (parts.length === 1 && parts[0]) {
      // Short link — we don't know which kind without resolving
      return { platform: "pocketcasts", kind: "unknown", pcaId: parts[0], pcaUrl: url };
    }
    return null;
  }
  if (PC_HOST.test(u.hostname)) {
    const m = u.pathname.match(/\/podcasts\/([A-Za-z0-9-]+)/);
    if (m) return { platform: "pocketcasts", kind: "show", pcaId: m[1], pcaUrl: url };
  }
  return null;
}
