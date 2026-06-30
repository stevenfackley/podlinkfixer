// Integration tests for resolveSource() + buildAllTargets() against fixture-backed
// external APIs. These assert the lookup/match/resolve internals directly (cleaner
// than going through the HTTP layer) for the cross-provider recovery cases.
import { afterEach, describe, expect, test, vi } from "vitest";
import { resolveSource } from "../src/resolve";
import { buildAllTargets } from "../src/targets";
import type { ParsedSource } from "../src/parsers";
import { installFetchMock } from "./helpers/mock-fetch";
import { resolveEnv } from "./helpers/worker";

import piSearchLowConf from "./fixtures/podcast-index/search-lowconf.json";
import piSearchEmpty from "./fixtures/podcast-index/search-empty.json";
import piByItunesIdNotFound from "./fixtures/podcast-index/byitunesid-notfound.json";

const SPOTIFY_SHOW_SRC: ParsedSource = {
  platform: "spotify",
  kind: "show",
  spotifyId: "3IM0lmZxpFAY7CwMuv9H4g",
};
const APPLE_SHOW_SRC: ParsedSource = {
  platform: "apple",
  showId: "1200361736",
  episodeId: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveSource — Spotify show recovers iTunes ID via Podcast Index", () => {
  test("Spotify -> Apple: canonical show carries the recovered iTunes ID + feed", async () => {
    installFetchMock();
    const env = resolveEnv();

    const resolved = await resolveSource(SPOTIFY_SHOW_SRC, env);
    expect(resolved).not.toBeNull();
    expect(resolved!.show.title).toBe("The Daily");
    expect(resolved!.show.publisher).toBe("The New York Times");
    // Podcast Index search recovered the canonical iTunes ID + RSS feed.
    expect(resolved!.show.itunesId).toBe("1200361736");
    expect(resolved!.show.feedUrl).toBe("https://feeds.simplecast.com/Sl5CSM3S");

    // With an iTunes ID, the Apple target (and other ID-gated targets) build.
    const targets = await buildAllTargets(resolved!.show, resolved!.episode, env);
    const apple = targets.find((t) => t.platform === "apple");
    expect(apple).toBeDefined();
    expect(apple!.url).toContain("podcasts.apple.com");
  });
});

describe("resolveSource — Podcast Index failure is non-fatal for Apple sources", () => {
  test("Apple resolution still succeeds when Podcast Index 500s", async () => {
    // byitunesid 500s; resolveApple swallows it (PI is an enhancement, not required).
    installFetchMock({ piByItunesId: { status: 500, json: { error: "PI down" } } });
    const env = resolveEnv();

    const resolved = await resolveSource(APPLE_SHOW_SRC, env);
    expect(resolved).not.toBeNull();
    expect(resolved!.show.title).toBe("The Daily");
    // iTunes ID comes from the source URL; feed URL comes from the iTunes show payload.
    expect(resolved!.show.itunesId).toBe("1200361736");
    expect(resolved!.show.feedUrl).toBe("https://feeds.simplecast.com/Sl5CSM3S");
  });

  test("tolerates a transport-level (rejected) Podcast Index call", async () => {
    installFetchMock({ piByItunesId: { networkError: true } });
    const env = resolveEnv();

    const resolved = await resolveSource(APPLE_SHOW_SRC, env);
    expect(resolved).not.toBeNull();
    expect(resolved!.show.itunesId).toBe("1200361736");
  });

  test("tolerates a Podcast Index 'no match' (empty feed) response", async () => {
    installFetchMock({ piByItunesId: { json: piByItunesIdNotFound } });
    const env = resolveEnv();

    const resolved = await resolveSource(APPLE_SHOW_SRC, env);
    expect(resolved).not.toBeNull();
    expect(resolved!.show.itunesId).toBe("1200361736");
  });
});

describe("resolveSource — weak/empty Podcast Index search degrades gracefully", () => {
  test("low-confidence match: no iTunes ID is claimed, only ID-free targets are built", async () => {
    // PI search returns an unrelated feed -> pickBestFeed() rejects it (below threshold).
    installFetchMock({ piSearch: { json: piSearchLowConf } });
    const env = resolveEnv();

    const resolved = await resolveSource(SPOTIFY_SHOW_SRC, env);
    expect(resolved).not.toBeNull();
    // Show metadata still comes back from Spotify...
    expect(resolved!.show.title).toBe("The Daily");
    // ...but no spurious iTunes ID/feed is attached from the bad match.
    expect(resolved!.show.itunesId).toBeNull();
    expect(resolved!.show.feedUrl).toBeNull();

    const targets = await buildAllTargets(resolved!.show, resolved!.episode, env);
    const platforms = targets.map((t) => t.platform);
    // ID-gated targets are correctly omitted...
    expect(platforms).not.toContain("apple");
    expect(platforms).not.toContain("castro");
    expect(platforms).not.toContain("overcast");
    expect(platforms).not.toContain("pocketcasts");
    // ...while search/show targets still resolve.
    expect(platforms).toContain("spotify");
    expect(platforms).toContain("youtube_music");
    expect(platforms).toContain("amazon_music");
    expect(platforms).toContain("audible");
  });

  test("empty search result also yields a graceful, ID-free resolution", async () => {
    installFetchMock({ piSearch: { json: piSearchEmpty } });
    const env = resolveEnv();

    const resolved = await resolveSource(SPOTIFY_SHOW_SRC, env);
    expect(resolved).not.toBeNull();
    expect(resolved!.show.itunesId).toBeNull();
  });
});
