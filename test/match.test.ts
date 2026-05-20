import { describe, expect, test } from "vitest";
import {
  combinedConfidence,
  dateProximity,
  MATCH_THRESHOLD,
  normalizeTitle,
  titleSimilarity,
} from "../src/match/confidence";
import { bestEpisodeMatch } from "../src/match/episode";

describe("normalizeTitle", () => {
  test("strips 'Ep. 123:' prefix", () => {
    expect(normalizeTitle("Ep. 123: A New Hope")).toBe("a new hope");
  });
  test("strips '#42 -' prefix", () => {
    expect(normalizeTitle("#42 - The Answer")).toBe("the answer");
  });
  test("strips 'Episode 7 —' prefix", () => {
    expect(normalizeTitle("Episode 7 — The Awakening")).toBe("the awakening");
  });
  test("strips '(Bonus)' suffix", () => {
    expect(normalizeTitle("Election Special (Bonus)")).toBe("election special");
  });
  test("collapses whitespace and punctuation", () => {
    expect(normalizeTitle("Hello,   World!!  (Final)")).toBe("hello world final");
  });
});

describe("titleSimilarity", () => {
  test("identical -> 1", () => {
    expect(titleSimilarity("Foo Bar", "foo bar")).toBe(1);
  });
  test("normalized identical -> 1", () => {
    expect(titleSimilarity("Ep. 1: Hello World", "Episode 1 — Hello World")).toBe(1);
  });
  test("totally different -> low", () => {
    expect(titleSimilarity("Cats", "Astrophysics")).toBeLessThan(0.3);
  });
  test("near-match -> high", () => {
    expect(titleSimilarity("The Climate Crisis", "The Climate Crises")).toBeGreaterThan(0.9);
  });
});

describe("dateProximity", () => {
  test("same day -> 1", () => {
    expect(dateProximity("2026-05-19", "2026-05-19")).toBe(1);
  });
  test("one day apart -> 0.8", () => {
    expect(dateProximity("2026-05-19", "2026-05-20")).toBe(0.8);
  });
  test("two days apart -> 0.5", () => {
    expect(dateProximity("2026-05-19", "2026-05-21")).toBe(0.5);
  });
  test("more than 2 days -> 0", () => {
    expect(dateProximity("2026-05-19", "2026-05-25")).toBe(0);
  });
  test("undefined input -> 0", () => {
    expect(dateProximity(null, "2026-05-19")).toBe(0);
    expect(dateProximity("2026-05-19", undefined)).toBe(0);
  });
});

describe("combinedConfidence", () => {
  test("perfect title + perfect date = 1", () => {
    expect(combinedConfidence(1, 1)).toBe(1);
  });
  test("perfect title + zero date still passes threshold", () => {
    expect(combinedConfidence(1, 0)).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
  });
});

describe("bestEpisodeMatch", () => {
  test("picks the highest confidence candidate", () => {
    const match = bestEpisodeMatch(
      { title: "The Climate Crisis", publishedAt: "2026-05-19" },
      [
        { title: "Unrelated episode", publishedAt: "2026-05-19", payload: "wrong" },
        { title: "The Climate Crisis", publishedAt: "2026-05-19", payload: "right" },
        { title: "The Climate Crisis (Rebroadcast)", publishedAt: "2025-01-01", payload: "old" },
      ],
    );
    expect(match?.payload).toBe("right");
  });

  test("returns null when nothing crosses threshold", () => {
    const match = bestEpisodeMatch(
      { title: "Astrophysics for Beginners", publishedAt: "2026-05-19" },
      [
        { title: "Cats and Dogs", publishedAt: "2024-01-01", payload: "x" },
        { title: "Bread Baking 101", publishedAt: "2024-01-02", payload: "y" },
      ],
    );
    expect(match).toBeNull();
  });

  test("works with empty candidate list", () => {
    const match = bestEpisodeMatch({ title: "anything", publishedAt: "2026-05-19" }, []);
    expect(match).toBeNull();
  });
});
