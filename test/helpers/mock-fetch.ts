// Mock-HTTP harness for the external lookup APIs (iTunes / Spotify / Podcast Index).
//
// The resolve/match/target path is normally only exercisable with `wrangler dev`
// running against the LIVE third-party APIs. These helpers stub the global `fetch`
// with committed JSON fixtures so the whole flow runs deterministically, offline.
//
// Fixture provenance:
//   - iTunes fixtures are trimmed captures of the real public iTunes Search API
//     (https://itunes.apple.com/lookup — no auth) for "The Daily" (id 1200361736).
//   - Spotify + Podcast Index fixtures are authored to match each API's documented
//     response schema (both require auth, so they can't be captured anonymously).
import { vi } from "vitest";

import itunesShow from "../fixtures/itunes/show.json";
import itunesEpisode from "../fixtures/itunes/episode.json";
import itunesShowEpisodes from "../fixtures/itunes/show-episodes.json";

import spotifyToken from "../fixtures/spotify/token.json";
import spotifyShow from "../fixtures/spotify/show.json";
import spotifyEpisode from "../fixtures/spotify/episode.json";
import spotifyShowEpisodes from "../fixtures/spotify/show-episodes.json";
import spotifySearch from "../fixtures/spotify/search-shows.json";

import piByItunesId from "../fixtures/podcast-index/byitunesid.json";
import piSearch from "../fixtures/podcast-index/search.json";

/** How a single mocked endpoint should respond. */
export interface MockResponseSpec {
  /** HTTP status to return (default 200). */
  status?: number;
  /** JSON body to serialize. Ignored when `networkError` is set. */
  json?: unknown;
  /** When true the fetch rejects, simulating a transport-level failure. */
  networkError?: boolean;
}

/** Per-endpoint overrides. Anything omitted falls back to the happy-path fixture. */
export interface ApiOverrides {
  itunesShow?: MockResponseSpec;
  itunesEpisode?: MockResponseSpec;
  itunesShowEpisodes?: MockResponseSpec;
  spotifyToken?: MockResponseSpec;
  spotifyShow?: MockResponseSpec;
  spotifyEpisode?: MockResponseSpec;
  spotifyShowEpisodes?: MockResponseSpec;
  spotifySearch?: MockResponseSpec;
  piByItunesId?: MockResponseSpec;
  piSearch?: MockResponseSpec;
}

export interface RecordedCall {
  url: string;
  method: string;
}

export interface FetchMockHandle {
  /** The stubbed implementation (already installed on globalThis.fetch). */
  fetch: typeof fetch;
  /** Every fetch the code under test made, in order. */
  calls: RecordedCall[];
  /** Count of calls whose URL contains `needle`. */
  countMatching(needle: string): number;
}

function toResponse(spec: MockResponseSpec): Response {
  const status = spec.status ?? 200;
  const body = spec.json === undefined ? null : JSON.stringify(spec.json);
  return new Response(body, {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Route a request URL to the right endpoint override (or its default fixture).
 * Returns null for URLs we don't recognize so the caller can fail loudly.
 */
function resolveSpec(url: URL, overrides: ApiOverrides): MockResponseSpec | null {
  const host = url.hostname;
  const path = url.pathname;

  if (host === "itunes.apple.com" && path === "/lookup") {
    const entity = url.searchParams.get("entity");
    if (entity === "podcast") return overrides.itunesShow ?? { json: itunesShow };
    if (entity === "podcastEpisode") {
      // getAppleShowEpisodes passes a `limit`; getAppleEpisode does not.
      return url.searchParams.has("limit")
        ? overrides.itunesShowEpisodes ?? { json: itunesShowEpisodes }
        : overrides.itunesEpisode ?? { json: itunesEpisode };
    }
    return null;
  }

  if (host === "accounts.spotify.com") {
    return overrides.spotifyToken ?? { json: spotifyToken };
  }

  if (host === "api.spotify.com") {
    if (path.startsWith("/v1/search")) return overrides.spotifySearch ?? { json: spotifySearch };
    if (/^\/v1\/shows\/[^/]+\/episodes$/.test(path)) {
      return overrides.spotifyShowEpisodes ?? { json: spotifyShowEpisodes };
    }
    if (/^\/v1\/shows\/[^/]+$/.test(path)) return overrides.spotifyShow ?? { json: spotifyShow };
    if (/^\/v1\/episodes\/[^/]+$/.test(path)) {
      return overrides.spotifyEpisode ?? { json: spotifyEpisode };
    }
    return null;
  }

  if (host === "api.podcastindex.org") {
    if (path.includes("/podcasts/byitunesid")) {
      return overrides.piByItunesId ?? { json: piByItunesId };
    }
    if (path.includes("/search/byterm")) return overrides.piSearch ?? { json: piSearch };
    // Other PI endpoints aren't on the tested resolve path; treat as "not found".
    return { json: { status: "true", feed: {}, feeds: [] } };
  }

  return null;
}

/**
 * Install a fixture-backed `fetch` on `globalThis` (via vi.stubGlobal).
 * Call `vi.unstubAllGlobals()` in afterEach to restore the real fetch.
 */
export function installFetchMock(overrides: ApiOverrides = {}): FetchMockHandle {
  const calls: RecordedCall[] = [];

  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ url: urlStr, method });

    const spec = resolveSpec(new URL(urlStr), overrides);
    if (!spec) {
      throw new Error(`installFetchMock: unhandled request ${method} ${urlStr}`);
    }
    if (spec.networkError) {
      throw new TypeError(`installFetchMock: simulated network failure for ${urlStr}`);
    }
    return toResponse(spec);
  });

  vi.stubGlobal("fetch", impl);

  return {
    fetch: impl as unknown as typeof fetch,
    calls,
    countMatching: (needle: string) => calls.filter((c) => c.url.includes(needle)).length,
  };
}
