import { uuidv7 } from "uuidv7";
import type { PlayHistoryEntry } from "@/models";

/** Longest a play has to run before it counts, in seconds. */
export const SCROBBLE_MAX_SECONDS = 240;

/** Largest position step counted as listening, so a seek cannot scrobble. */
const MAX_LISTEN_STEP_SECONDS = 5;

/**
 * How long a track must play to count: half its length, or four minutes for
 * tracks longer than eight. Unknown lengths fall back to four minutes.
 */
export function scrobbleThreshold(durationSeconds?: number): number {
  if (!durationSeconds || durationSeconds <= 0) return SCROBBLE_MAX_SECONDS;
  return Math.min(durationSeconds / 2, SCROBBLE_MAX_SECONDS);
}

/**
 * Follows one track's playback and reports the play once it passes the
 * threshold. Positions are fed in as they advance; a jump larger than a few
 * seconds (a seek) is not counted as listening.
 */
export class ScrobbleTracker {
  private songId?: string;
  private startedAt = 0;
  private lastPosition = 0;
  private listened = 0;
  private durationSeconds?: number;
  private recorded = false;

  /** Begin following a track from its start. */
  start(
    songId: string,
    durationSeconds: number | undefined,
    now: number
  ): void {
    this.songId = songId;
    this.startedAt = now;
    this.lastPosition = 0;
    this.listened = 0;
    this.durationSeconds = durationSeconds;
    this.recorded = false;
  }

  /** Forget the current track without recording it. */
  reset(): void {
    this.songId = undefined;
    this.recorded = false;
  }

  /**
   * Feed the current playback position. Returns the entry to record the
   * first time the threshold is met, then undefined.
   */
  advance(positionSeconds: number): PlayHistoryEntry | undefined {
    if (!this.songId || this.recorded) return undefined;

    const delta = positionSeconds - this.lastPosition;
    if (delta > 0 && delta <= MAX_LISTEN_STEP_SECONDS) {
      this.listened += delta;
    }
    this.lastPosition = positionSeconds;

    if (this.listened < scrobbleThreshold(this.durationSeconds)) {
      return undefined;
    }

    this.recorded = true;
    return {
      id: uuidv7(),
      songId: this.songId,
      playedAt: this.startedAt,
      listenedSeconds: Math.round(this.listened),
      durationSeconds: this.durationSeconds,
    };
  }
}
