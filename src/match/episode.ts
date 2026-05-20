import {
  combinedConfidence,
  dateProximity,
  MATCH_THRESHOLD,
  titleSimilarity,
} from "./confidence";

export interface SourceEpisode {
  title: string;
  publishedAt: string | null; // ISO date string
}

export interface EpisodeCandidate<T> {
  title: string;
  publishedAt: string | null;
  payload: T;
}

export interface EpisodeMatch<T> {
  payload: T;
  confidence: number;
  titleSim: number;
  dateProx: number;
}

// Pick the candidate with highest combined confidence. Returns null if no candidate exceeds threshold.
export function bestEpisodeMatch<T>(
  source: SourceEpisode,
  candidates: EpisodeCandidate<T>[],
  threshold = MATCH_THRESHOLD,
): EpisodeMatch<T> | null {
  let best: EpisodeMatch<T> | null = null;
  for (const c of candidates) {
    const tSim = titleSimilarity(source.title, c.title);
    const dProx = dateProximity(source.publishedAt, c.publishedAt);
    const conf = combinedConfidence(tSim, dProx);
    if (!best || conf > best.confidence) {
      best = { payload: c.payload, confidence: conf, titleSim: tSim, dateProx: dProx };
    }
  }
  if (!best || best.confidence < threshold) return null;
  return best;
}
