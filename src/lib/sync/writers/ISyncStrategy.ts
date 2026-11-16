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
