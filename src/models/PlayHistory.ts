/**
 * PlayHistoryEntry — one recorded play of a track.
 *
 * Written when a track passes the scrobble threshold (half its length, or
 * four minutes for longer tracks), so a skipped track leaves no entry.
 */
export interface PlayHistoryEntry {
  id: string;
  songId: string;
  /** Epoch ms when the play started. */
  playedAt: number;
  /** Seconds actually listened before the threshold was met. */
  listenedSeconds: number;
  /** Track length in seconds at the time of the play, when known. */
  durationSeconds?: number;
  sourceId?: string;
}
