// String + date similarity primitives shared by the episode matcher.

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    // strip common episode-number prefixes: "Ep. 12: ", "#42 - ", "Episode 7 — "
    .replace(/^\s*(?:ep(?:isode)?\.?\s*)?#?\d+\s*[:\-–—]\s*/i, "")
    // strip trailing "(Part 1)", "[Bonus]"
    .replace(/\s*[\[(](?:bonus|part\s*\d+|preview|teaser)[\])]\s*$/gi, "")
    // collapse punctuation to spaces
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Iterative Levenshtein with two rolling rows. Plenty fast for podcast titles.
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = new Array(b.length + 1);
  let curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// 1.0 = identical (after normalization), 0.0 = totally different.
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na.length || !nb.length) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  return Math.max(0, 1 - dist / Math.max(na.length, nb.length));
}

// 1.0 = same day, 0.8 = ±1 day, 0.5 = ±2 days, 0.0 = otherwise.
// Date strings are parsed as ISO 8601; falsy inputs yield 0.
export function dateProximity(a: string | undefined | null, b: string | undefined | null): number {
  if (!a || !b) return 0;
  const da = Date.parse(a);
  const db = Date.parse(b);
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  const diffDays = Math.abs(da - db) / (1000 * 60 * 60 * 24);
  if (diffDays < 0.5) return 1;
  if (diffDays < 1.5) return 0.8;
  if (diffDays < 2.5) return 0.5;
  return 0;
}

// Weighted combination. Title is the strong signal; date breaks ties on rebroadcasts/remasters.
export function combinedConfidence(
  titleSim: number,
  dateProx: number,
  weights: { title: number; date: number } = { title: 0.7, date: 0.3 },
): number {
  return titleSim * weights.title + dateProx * weights.date;
}

// Match is "good enough" to claim we found the right episode. Below this we fall back to show-level.
export const MATCH_THRESHOLD = 0.7;
