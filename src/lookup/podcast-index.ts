// Podcast Index API client.
// Auth: every request signs with SHA-1 of (apiKey + apiSecret + unixTimestamp).
// Docs: https://podcastindex-org.github.io/docs-api/

const BASE = "https://api.podcastindex.org/api/1.0";
const UA = "PodLinkFixer/0.1 (+https://podlinkfixer.workers.dev)";

export interface PIFeed {
  id: number;
  podcastGuid?: string;
  title: string;
  url: string;                 // feed URL
  originalUrl?: string;
  link?: string;               // website URL
  image?: string;
  artwork?: string;
  itunesId?: number | null;
  author?: string;
  ownerName?: string;
  language?: string;
  // Some entries include these — present when Podcast Index has cross-platform data:
  value?: any;
}

export interface PIEpisode {
  id: number;
  title: string;
  description?: string;
  guid?: string;
  datePublished: number;       // unix seconds
  datePublishedPretty?: string;
  enclosureUrl?: string;
  duration?: number;
  feedId: number;
  feedTitle?: string;
  feedItunesId?: number | null;
  link?: string;
  image?: string;
}

export interface PICredentials {
  apiKey: string;
  apiSecret: string;
}

async function sha1Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function piHeaders(creds: PICredentials): Promise<HeadersInit> {
  const apiHeaderTime = Math.floor(Date.now() / 1000).toString();
  const auth = await sha1Hex(creds.apiKey + creds.apiSecret + apiHeaderTime);
  return {
    "User-Agent": UA,
    "X-Auth-Date": apiHeaderTime,
    "X-Auth-Key": creds.apiKey,
    Authorization: auth,
  };
}

async function piFetch<T>(path: string, params: Record<string, string>, creds: PICredentials): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { headers: await piHeaders(creds) });
  if (!res.ok) throw new Error(`Podcast Index ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

export async function feedByItunesId(itunesId: string, creds: PICredentials): Promise<PIFeed | null> {
  const data = await piFetch<{ status: string | boolean; feed: PIFeed }>(
    "/podcasts/byitunesid",
    { id: itunesId },
    creds,
  );
  // status can be "true" / true / "false" — and feed may be {} when not found
  if (!data?.feed?.id) return null;
  return data.feed;
}

export async function feedByGuid(guid: string, creds: PICredentials): Promise<PIFeed | null> {
  const data = await piFetch<{ feed: PIFeed }>("/podcasts/byguid", { guid }, creds);
  if (!data?.feed?.id) return null;
  return data.feed;
}

export async function feedByFeedUrl(feedUrl: string, creds: PICredentials): Promise<PIFeed | null> {
  const data = await piFetch<{ feed: PIFeed }>("/podcasts/byfeedurl", { url: feedUrl }, creds);
  if (!data?.feed?.id) return null;
  return data.feed;
}

export async function searchByTerm(q: string, creds: PICredentials, max = 10): Promise<PIFeed[]> {
  const data = await piFetch<{ feeds: PIFeed[] }>(
    "/search/byterm",
    { q, max: String(max) },
    creds,
  );
  return data?.feeds ?? [];
}

export async function episodesByFeedId(
  feedId: number,
  creds: PICredentials,
  max = 50,
): Promise<PIEpisode[]> {
  const data = await piFetch<{ items: PIEpisode[] }>(
    "/episodes/byfeedid",
    { id: String(feedId), max: String(max) },
    creds,
  );
  return data?.items ?? [];
}
