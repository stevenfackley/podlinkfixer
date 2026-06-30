// End-to-end integration tests for the /api/convert handler, driven through the Hono
// app's fetch() against fixture-backed external APIs. Exercises the full path:
// parse -> cache check -> external lookup -> match -> targets -> cache write.
import { afterEach, describe, expect, test, vi } from "vitest";
import app from "../src/index";
import { MATCH_THRESHOLD } from "../src/match/confidence";
import { installFetchMock } from "./helpers/mock-fetch";
import { convertRequest, makeCtx, makeEnv, memoryKV } from "./helpers/worker";

import itunesEmpty from "./fixtures/itunes/empty.json";
import spotifySearchEmpty from "./fixtures/spotify/search-empty.json";

// A real Apple "The Daily" episode URL (matches the committed fixtures).
const APPLE_EPISODE_URL =
  "https://podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000774831986";
const APPLE_SHOW_URL = "https://podcasts.apple.com/us/podcast/the-daily/id1200361736";
const SPOTIFY_SHOW_URL = "https://open.spotify.com/show/3IM0lmZxpFAY7CwMuv9H4g";

interface ConvertResponse {
  source: { platform: string };
  show: { title: string; publisher: string | null; itunes_id: string | null };
  episode: { title: string; published_at: string } | null;
  targets: { platform: string; url: string; kind: string; confidence?: number }[];
  cached: boolean;
  error?: string;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("/api/convert — happy path (Apple episode resolves across platforms)", () => {
  test("resolves the show, episode, and episode-level Apple + Spotify targets", async () => {
    installFetchMock();
    const env = makeEnv();
    const { ctx, settle } = makeCtx();

    const res = await app.fetch(convertRequest(APPLE_EPISODE_URL), env, ctx);
    await settle();

    expect(res.status).toBe(200);
    const body = (await res.json()) as ConvertResponse;

    expect(body.source.platform).toBe("apple");
    expect(body.show.title).toBe("The Daily");
    expect(body.show.itunes_id).toBe("1200361736");
    expect(body.episode?.title).toBe("The Supreme Court Expands Presidential Power. Again.");
    expect(body.cached).toBe(false);

    const byPlatform = new Map(body.targets.map((t) => [t.platform, t]));
    // Every target builder fired; the 8 platforms are all represented.
    expect(body.targets.length).toBe(8);

    const apple = byPlatform.get("apple");
    expect(apple?.kind).toBe("episode");
    expect(apple?.confidence).toBeGreaterThanOrEqual(MATCH_THRESHOLD);

    const spotify = byPlatform.get("spotify");
    expect(spotify?.kind).toBe("episode");
    expect(spotify?.confidence).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    expect(spotify?.url).toContain("open.spotify.com/episode/");
  });
});

describe("/api/convert — one provider down, others still succeed", () => {
  test("Spotify failing does not break resolution or the other targets", async () => {
    // Spotify token endpoint 500s -> buildSpotifyTarget rejects. Because buildAllTargets
    // uses Promise.allSettled, every other target must still resolve.
    const mock = installFetchMock({ spotifyToken: { status: 500, json: { error: "down" } } });
    const env = makeEnv();
    const { ctx, settle } = makeCtx();

    const res = await app.fetch(convertRequest(APPLE_EPISODE_URL), env, ctx);
    await settle();

    expect(res.status).toBe(200);
    const body = (await res.json()) as ConvertResponse;
    const platforms = body.targets.map((t) => t.platform);

    // Spotify dropped out...
    expect(platforms).not.toContain("spotify");
    // ...but Apple-rooted resolution and all non-Spotify targets are intact.
    expect(platforms).toContain("apple");
    expect(platforms).toContain("youtube_music");
    expect(platforms).toContain("amazon_music");
    expect(platforms).toContain("audible");
    expect(platforms).toContain("castro");
    expect(platforms).toContain("overcast");
    expect(platforms).toContain("pocketcasts");
    expect(body.targets.length).toBe(7);

    // Spotify was actually attempted (token fetch), proving the failure was tolerated.
    expect(mock.countMatching("accounts.spotify.com")).toBeGreaterThanOrEqual(1);
  });
});

describe("/api/convert — unresolvable source", () => {
  test("returns a graceful 404 when the Spotify show can't be found", async () => {
    // Spotify show lookup 404s -> resolveSpotify returns null -> handler 404s.
    installFetchMock({ spotifyShow: { status: 404, json: { error: { status: 404 } } } });
    const env = makeEnv();
    const { ctx, settle } = makeCtx();

    const res = await app.fetch(convertRequest(SPOTIFY_SHOW_URL), env, ctx);
    await settle();

    expect(res.status).toBe(404);
    const body = (await res.json()) as ConvertResponse;
    expect(typeof body.error).toBe("string");
    expect(body.error?.length).toBeGreaterThan(0);
  });

  test("returns 404 when iTunes has no result for the Apple show", async () => {
    // Empty iTunes lookup -> getAppleShow() null -> resolveApple() null -> handler 404s.
    installFetchMock({ itunesShow: { json: itunesEmpty } });
    const env = makeEnv();
    const { ctx, settle } = makeCtx();

    const res = await app.fetch(convertRequest(APPLE_SHOW_URL), env, ctx);
    await settle();

    expect(res.status).toBe(404);
    expect(typeof ((await res.json()) as ConvertResponse).error).toBe("string");
  });
});

describe("/api/convert — provider returns no match (soft miss)", () => {
  test("an empty Spotify search omits the Spotify target but keeps the rest", async () => {
    // searchShows() returns no candidates -> buildSpotifyTarget() returns null (not an
    // error), so Spotify is simply absent while Apple-rooted targets still resolve.
    installFetchMock({ spotifySearch: { json: spotifySearchEmpty } });
    const env = makeEnv();
    const { ctx, settle } = makeCtx();

    const res = await app.fetch(convertRequest(APPLE_SHOW_URL), env, ctx);
    await settle();

    expect(res.status).toBe(200);
    const platforms = ((await res.json()) as ConvertResponse).targets.map((t) => t.platform);
    expect(platforms).not.toContain("spotify");
    expect(platforms).toContain("apple");
    expect(platforms).toContain("youtube_music");
  });
});

describe("/api/convert — KV cache hit", () => {
  test("second identical request is served from cache without re-fetching", async () => {
    const mock = installFetchMock();
    const kv = memoryKV();
    const env = makeEnv(kv); // shared KV across both calls

    // First call populates the cache (write is fire-and-forget via waitUntil).
    const first = makeCtx();
    const res1 = await app.fetch(convertRequest(APPLE_SHOW_URL), env, first.ctx);
    await first.settle();
    expect(res1.status).toBe(200);
    expect(((await res1.json()) as ConvertResponse).cached).toBe(false);

    const fetchesAfterFirst = mock.calls.length;
    expect(fetchesAfterFirst).toBeGreaterThan(0);

    // Second call with the same URL must hit KV and make zero new external fetches.
    const second = makeCtx();
    const res2 = await app.fetch(convertRequest(APPLE_SHOW_URL), env, second.ctx);
    await second.settle();
    expect(res2.status).toBe(200);

    const body2 = (await res2.json()) as ConvertResponse;
    expect(body2.cached).toBe(true);
    expect(body2.show.title).toBe("The Daily");
    expect(mock.calls.length).toBe(fetchesAfterFirst);
  });
});
