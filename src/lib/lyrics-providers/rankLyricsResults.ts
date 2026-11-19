import type { ILyricsQuery, ILyricsResult } from "./ILyricsService";

/** A lyrics record with the score it earned against the query. */
export interface IRankedLyricsResult extends ILyricsResult {
  /** 0..1 match score against the query; 1 is a perfect match. */
  matchScore: number;
}

/** Durations within this many seconds count as the same recording. */
const DURATION_EXACT_SECONDS = 2;

/** Durations this far apart score zero on the duration signal. */
const DURATION_TOLERANCE_SECONDS = 30;

/**
 * Signal weights. Duration dominates because it is what separates different
 * recordings of the same song — a live take, a single edit, a remaster.
 */
const WEIGHTS = {
  duration: 3,
  title: 2,
  artist: 1.5,
  album: 0.5,
} as const;

/** Small preference for a record that carries timestamps, used as a tiebreak. */
function hasSynced(result: ILyricsResult): number {
  return result.syncedLyrics ? 1 : 0;
}

function normalize(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Similarity of two names: exact, containment, then token overlap. */
function textScore(
  query: string | undefined,
  candidate: string | undefined
): number | undefined {
  const left = normalize(query);
  const right = normalize(candidate);
  if (!left || !right) return undefined;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.75;

  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) shared++;
  }
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? undefined : shared / union;
}

/** Proximity of two track lengths, falling off to zero at the tolerance. */
function durationScore(
  query: number | undefined,
  candidate: number | undefined
): number | undefined {
  if (!query || !candidate) return undefined;

  const diff = Math.abs(query - candidate);
  if (diff <= DURATION_EXACT_SECONDS) return 1;

  const span = DURATION_TOLERANCE_SECONDS - DURATION_EXACT_SECONDS;
  return Math.max(0, 1 - (diff - DURATION_EXACT_SECONDS) / span);
}

function scoreResult(result: ILyricsResult, query: ILyricsQuery): number {
  const signals: Array<[score: number, weight: number]> = [];

  const duration = durationScore(query.duration, result.duration);
  if (duration !== undefined) signals.push([duration, WEIGHTS.duration]);

  const title = textScore(query.title, result.title);
  if (title !== undefined) signals.push([title, WEIGHTS.title]);

  const artist = textScore(query.artist, result.artist);
  if (artist !== undefined) signals.push([artist, WEIGHTS.artist]);

  const album = textScore(query.album, result.album);
  if (album !== undefined) signals.push([album, WEIGHTS.album]);

  if (signals.length === 0) return 0;

  const totalWeight = signals.reduce((sum, [, weight]) => sum + weight, 0);
  return (
    signals.reduce((sum, [score, weight]) => sum + score * weight, 0) /
    totalWeight
  );
}

/**
 * Orders lyrics results best match first.
 *
 * The score blends how close each record's length is to the track being
 * edited with how well its title, artist and album match the query, so the
 * recording the user actually has floats above other takes of the same song.
 * Signals the query cannot supply are dropped and the remaining weights are
 * renormalized, so a query without a duration still ranks sensibly. Records
 * that carry timestamps win ties.
 *
 * @example
 * ```ts
 * const ranked = rankLyricsResults(results, { title, artist, duration });
 * const best = ranked[0];
 * ```
 */
export function rankLyricsResults(
  results: ILyricsResult[],
  query: ILyricsQuery
): IRankedLyricsResult[] {
  return results
    .map((result) => ({ ...result, matchScore: scoreResult(result, query) }))
    .sort(
      (a, b) => b.matchScore - a.matchScore || hasSynced(b) - hasSynced(a)
    );
}
