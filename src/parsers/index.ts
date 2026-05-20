import { parseAppleUrl } from "./apple";
import { parseSpotifyUrl } from "./spotify";
import { parsePocketCastsUrl } from "./pocketcasts";
import { parseOvercastUrl } from "./overcast";
import type { ParsedSource } from "./types";

export * from "./types";

export function detectAndParse(input: string): ParsedSource | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Normalize: prepend https:// if user pastes a bare URL like "podcasts.apple.com/..."
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let u: URL;
  try {
    u = new URL(withScheme);
  } catch {
    return null;
  }

  return (
    parseAppleUrl(u) ??
    parseSpotifyUrl(u) ??
    parsePocketCastsUrl(u) ??
    parseOvercastUrl(u) ??
    null
  );
}
