import type { Playlist, Song, SyncDevice } from "@/models";

/** What happened to one song in a sync run. */
export interface SyncSongOutcome {
  songId: string;
  /**
   * - `written`: handed to the device writer; not yet confirmed.
   * - `verified`: re-read from the saved device database, file present.
   * - `present`: already on the device before this run.
   * - `skipped`: its audio could not be read, so it was left out.
   * - `unverified`: written, but missing when the device was re-read.
   */
  status: "written" | "verified" | "present" | "skipped" | "unverified";
}

/** Outcomes that mean the song is confirmed on the device. */
export function isOnDevice(status: SyncSongOutcome["status"]): boolean {
  return status === "verified" || status === "present";
}

/**
 * Reports how much of a sync has been written. `completed` counts songs
 * finished so far, `total` is the number of songs in this run, and `outcome`
 * describes the song that just finished.
 */
export type SyncProgressHandler = (
  completed: number,
  total: number,
  outcome?: SyncSongOutcome
) => void;

/**
 * What a sync actually did. A run can finish without writing anything (every
 * song unreadable), so the caller needs this to tell success from a no-op.
 * Each list holds song ids.
 */
export interface SyncSummary {
  /** Songs newly written and confirmed by re-reading the device. */
  added: string[];
  /** Songs written but not found when the device was re-read. */
  unverified: string[];
  /** Songs that were already on the device. */
  alreadyPresent: string[];
  /** Songs that could not be written because their audio was unavailable. */
  skipped: string[];
}

/**
 * Handle a unit of work uses to persist a device's database.
 *
 * A device writer copies media first and records it in a database second, so
 * an interrupted run can leave media on the device that nothing points at.
 * Committing after each song keeps the two in step: a run that stops early
 * leaves saved tracks, never orphaned media.
 *
 * Devices with no database of their own (plain MTP) have nothing to commit
 * and do not use this.
 */
export interface DbSession {
  /** Record that the database has unsaved changes. */
  markDirty: () => void;
  /** Save the database when there is anything to save. */
  commit: () => Promise<void>;
  /** Whether changes have been made since the last commit. */
  isDirty: () => boolean;
  /**
   * Register an undo step for work already done, run newest first by
   * {@link rollback}. A device writer registers one per written track so a
   * failed run can take back what it wrote.
   */
  onRollback: (undo: () => Promise<void> | void) => void;
  /** Run the registered undo steps, newest first. */
  rollback: () => Promise<void>;
}

/**
 * Build a {@link DbSession} around a strategy's save call.
 *
 * The dirty flag lives here so every device writer commits on the same terms:
 * a commit with nothing pending does no work, which keeps a no-op sync from
 * rewriting the database.
 */
export function createDbSession(save: () => Promise<void>): DbSession {
  let dirty = false;
  const undoSteps: (() => Promise<void> | void)[] = [];

  return {
    markDirty: () => {
      dirty = true;
    },
    commit: async () => {
      if (!dirty) return;
      await save();
      dirty = false;
    },
    isDirty: () => dirty,
    onRollback: (undo) => {
      undoSteps.push(undo);
    },
    rollback: async () => {
      for (let index = undoSteps.length - 1; index >= 0; index -= 1) {
        try {
          await undoSteps[index]();
        } catch {
          // Keep undoing: one step that cannot be taken back must not strand
          // the rest of the run's writes.
        }
      }
      undoSteps.length = 0;
    },
  };
}

export interface ISyncStrategy {
  canHandle(device: SyncDevice): boolean;
  /**
   * Sync a device: write the given songs and playlists together in one
   * pass. Already-present tracks are skipped; playlists are upserted by
   * name with their song order preserved (entries whose songs are not yet
   * on the device are skipped).
   *
   * Devices that cannot store playlists (e.g. MTP) simply ignore the
   * playlists argument.
   *
   * `onProgress` is called after each song is written so a caller can show
   * how far the run has got. It is optional: a strategy that cannot report
   * partial progress simply never calls it.
   */
  sync(
    device: SyncDevice,
    songs: Song[],
    playlists: Playlist[],
    onProgress?: SyncProgressHandler
  ): Promise<SyncSummary>;
  /**
   * Remove tracks from the device by their on-device track ids
   * (`SyncTrack.id`). Optional: devices whose tracks cannot be addressed
   * this way (MTP) leave it unimplemented.
   *
   * `onProgress` is called once per track as it is deleted, so a removal job
   * can report how far it has got instead of jumping at the end.
   */
  removeTracks?(
    device: SyncDevice,
    trackIds: number[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void>;
}
