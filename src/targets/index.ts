import { buildAppleTarget } from "./apple";
import { buildSpotifyTarget } from "./spotify";
import { buildYouTubeMusicTarget } from "./youtube-music";
import { buildPocketCastsTarget } from "./pocketcasts";
import { buildOvercastTarget } from "./overcast";
import { buildCastroTarget } from "./castro";
import { buildAmazonMusicTarget } from "./amazon-music";
import { buildAudibleTarget } from "./audible";
import type { CanonicalEpisode, CanonicalShow, TargetBuilder, TargetEnv, TargetPlatform, TargetResult } from "./types";

export * from "./types";

export const ALL_TARGETS: Record<TargetPlatform, TargetBuilder> = {
  apple: buildAppleTarget,
  spotify: buildSpotifyTarget,
  youtube_music: buildYouTubeMusicTarget,
  pocketcasts: buildPocketCastsTarget,
  overcast: buildOvercastTarget,
  castro: buildCastroTarget,
  amazon_music: buildAmazonMusicTarget,
  audible: buildAudibleTarget,
};

// Run every target builder in parallel. Null results (e.g. a builder needed itunesId
// but the canonical show didn't have one) are filtered out.
export async function buildAllTargets(
  show: CanonicalShow,
  episode: CanonicalEpisode | null,
  env: TargetEnv,
): Promise<TargetResult[]> {
  const platforms = Object.keys(ALL_TARGETS) as TargetPlatform[];
  const settled = await Promise.allSettled(
    platforms.map((p) => ALL_TARGETS[p](show, episode, env)),
  );
  const results: TargetResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled" && r.value) results.push(r.value);
  }
  return results;
}
