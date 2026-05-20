import { describe, expect, test } from "vitest";
import { detectAndParse } from "../src/parsers";

describe("Apple Podcasts", () => {
  test("show URL", () => {
    expect(
      detectAndParse("https://podcasts.apple.com/us/podcast/the-daily/id1200361736"),
    ).toEqual({ platform: "apple", showId: "1200361736", episodeId: null });
  });

  test("episode URL", () => {
    expect(
      detectAndParse(
        "https://podcasts.apple.com/us/podcast/the-daily/id1200361736?i=1000654321000",
      ),
    ).toEqual({ platform: "apple", showId: "1200361736", episodeId: "1000654321000" });
  });

  test("episode URL with extra params", () => {
    expect(
      detectAndParse(
        "https://podcasts.apple.com/gb/podcast/the-daily/id1200361736?i=1000654321000&l=en",
      ),
    ).toEqual({ platform: "apple", showId: "1200361736", episodeId: "1000654321000" });
  });

  test("bare host without scheme", () => {
    expect(
      detectAndParse("podcasts.apple.com/us/podcast/the-daily/id1200361736"),
    ).toEqual({ platform: "apple", showId: "1200361736", episodeId: null });
  });
});

describe("Spotify", () => {
  test("show URL", () => {
    expect(detectAndParse("https://open.spotify.com/show/4r2dQg7ec1xQiFkOlqgcwO")).toEqual({
      platform: "spotify",
      kind: "show",
      spotifyId: "4r2dQg7ec1xQiFkOlqgcwO",
    });
  });

  test("episode URL", () => {
    expect(detectAndParse("https://open.spotify.com/episode/12345abc67890")).toEqual({
      platform: "spotify",
      kind: "episode",
      spotifyId: "12345abc67890",
    });
  });

  test("with tracking param", () => {
    expect(
      detectAndParse("https://open.spotify.com/episode/12345abc67890?si=tracking"),
    ).toEqual({ platform: "spotify", kind: "episode", spotifyId: "12345abc67890" });
  });
});

describe("Pocket Casts", () => {
  test("podcast URL", () => {
    const r = detectAndParse("https://pca.st/podcast/abc-uuid-1234");
    expect(r).toMatchObject({ platform: "pocketcasts", kind: "show", pcaId: "abc-uuid-1234" });
  });

  test("episode URL", () => {
    const r = detectAndParse("https://pca.st/episode/ep-uuid-5678");
    expect(r).toMatchObject({ platform: "pocketcasts", kind: "episode", pcaId: "ep-uuid-5678" });
  });

  test("short URL", () => {
    const r = detectAndParse("https://pca.st/abcd1234");
    expect(r).toMatchObject({ platform: "pocketcasts", kind: "unknown", pcaId: "abcd1234" });
  });
});

describe("Overcast", () => {
  test("iTunes ID URL", () => {
    expect(detectAndParse("https://overcast.fm/itunes1200361736")).toMatchObject({
      platform: "overcast",
      kind: "itunes",
      overcastId: "1200361736",
    });
  });

  test("episode URL", () => {
    expect(detectAndParse("https://overcast.fm/+abcDEF123")).toMatchObject({
      platform: "overcast",
      kind: "episode",
      overcastId: "abcDEF123",
    });
  });

  test("podcast URL with slug", () => {
    expect(detectAndParse("https://overcast.fm/p123-the-daily")).toMatchObject({
      platform: "overcast",
      kind: "podcast",
      overcastId: "123",
    });
  });
});

describe("invalid input", () => {
  test("empty string", () => {
    expect(detectAndParse("")).toBeNull();
    expect(detectAndParse("   ")).toBeNull();
  });

  test("non-podcast URL", () => {
    expect(detectAndParse("https://example.com/foo")).toBeNull();
    expect(detectAndParse("https://youtube.com/watch?v=abc")).toBeNull();
  });

  test("malformed URL", () => {
    expect(detectAndParse("not a url at all !@#$")).toBeNull();
  });
});
