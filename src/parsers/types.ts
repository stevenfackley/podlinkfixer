export type SourcePlatform = "apple" | "spotify" | "pocketcasts" | "overcast";

export interface AppleSource {
  platform: "apple";
  showId: string;
  episodeId: string | null;
}

export interface SpotifySource {
  platform: "spotify";
  kind: "show" | "episode";
  spotifyId: string;
}

export interface PocketCastsSource {
  platform: "pocketcasts";
  kind: "show" | "episode" | "unknown";
  pcaId: string;
  pcaUrl: string;
}

export interface OvercastSource {
  platform: "overcast";
  kind: "itunes" | "podcast" | "episode";
  overcastId: string;
  overcastUrl: string;
}

export type ParsedSource = AppleSource | SpotifySource | PocketCastsSource | OvercastSource;

export function cacheKeyFor(src: ParsedSource): string {
  switch (src.platform) {
    case "apple":
      return `apple:${src.showId}:${src.episodeId ?? "show"}`;
    case "spotify":
      return `spotify:${src.kind}:${src.spotifyId}`;
    case "pocketcasts":
      return `pocketcasts:${src.kind}:${src.pcaId}`;
    case "overcast":
      return `overcast:${src.kind}:${src.overcastId}`;
  }
}
