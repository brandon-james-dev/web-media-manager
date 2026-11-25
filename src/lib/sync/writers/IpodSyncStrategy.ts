import type { Playlist, SyncDevice, Song } from "@/models";
import type {
  DbSession,
  ISyncStrategy,
  SyncProgressHandler,
  SyncSummary,
} from "./ISyncStrategy";
import { createDbSession } from "./ISyncStrategy";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import { getMetadataStore } from "@/lib/persistence/initMetadataStore";
import {
  detectDevice,
  Itdb,
  createBrowserFs,
  type ItdbFileSystem,
  type TrackMeta,
} from "itunesdb-ts";
import { trackIdentity } from "../helpers";
import { resolveSongBytesWithCache, resolveThroughSource } from "@/lib/offline";

/**
 * Convert an iPod track location to a path the filesystem port understands.
 *
 * The database stores locations colon-separated and rooted
 * (`:iPod_Control:Music:F03:Song.mp3`); the port takes `/`-separated paths
 * relative to the device root.
 */
export function ipodLocationToPath(location: string): string {
  return location.replace(/^:/, "").replace(/:/g, "/");
}

/** Reads a song's audio, whatever source it comes from. */
export type SongBytesResolver = (song: Song) => Promise<ArrayBuffer | null>;

/** Reads a song's cover art bytes, when it has any. */
export type SongArtworkResolver = (song: Song) => Promise<Uint8Array | null>;

/**
 * Resolve a song's bytes, preferring the offline cache.
 *
 * A sync job runs in a worker, where a remote source's credentials
 * (localStorage-backed) are unreachable — so a Subsonic song that is not
 * cached cannot be read there at all. The cache is checked first for every
 * source, which also keeps a local song readable if its folder is gone.
 */
const resolveCachedFirst: SongBytesResolver = async (song) =>
  await resolveSongBytesWithCache(song, resolveThroughSource);

/**
 * Read a song's front cover from the artwork store.
 *
 * IndexedDB is reachable from a worker, so the same rows the library shows are
 * available here. A song with no stored cover returns null and is written
 * without artwork, which is what the device shows for it today.
 */
const resolveStoredArtwork: SongArtworkResolver = async (song) => {
  try {
    const [{ getPictureOfType }, { ArtworkType }] = await Promise.all([
      import("@/core/media"),
      import("@/lib/contracts"),
    ]);
    const picture = await getPictureOfType(song.id, ArtworkType.FrontCover);
    return picture?.data ?? null;
  } catch {
    return null;
  }
};

export class IpodSyncStrategy implements ISyncStrategy {
  private readonly resolveBytes: SongBytesResolver;
  private readonly resolveArtwork: SongArtworkResolver;

  constructor(
    resolveBytes: SongBytesResolver = resolveCachedFirst,
    resolveArtwork: SongArtworkResolver = resolveStoredArtwork
  ) {
    this.resolveBytes = resolveBytes;
    this.resolveArtwork = resolveArtwork;
  }

  canHandle(device: SyncDevice): boolean {
    return device.type === "iPod";
  }

  /**
   * Add songs to the device. Additive: tracks already on the device are left
   * alone, and tracks not in the queue are never removed (use
   * {@link removeTracks} for that).
   */
  /**
   * Sync a device in one pass: add missing songs and write playlists
   * together — both concerns in one write.
   */
  async sync(
    device: SyncDevice,
    songs: Song[],
    playlists: Playlist[],
    onProgress?: SyncProgressHandler
  ): Promise<SyncSummary> {
    const summary: SyncSummary = {
      added: [],
      unverified: [],
      alreadyPresent: [],
      skipped: [],
    };

    await this.withDatabase(device, async (itdb, fs, session) => {
      // -- Songs -----------------------------------------------------------
      const existing = new Map<string, (typeof itdb.tracks)[number]>();
      for (const track of itdb.tracks) {
        existing.set(
          trackIdentity(track.title, track.album, track.artist),
          track
        );
      }

      const canStoreArtwork = (itdb.artworkFormats?.length ?? 0) > 0;
      let written = 0;

      for (const song of songs) {
        const key = trackIdentity(song.title, song.album, song.artist);
        const present = existing.get(key);

        if (present) {
          // Already on the device: it still counts as done for the run. A
          // track written before cover art was carried, or by another tool,
          // has no image yet; give it the stored cover now.
          if (canStoreArtwork && !(present.mhiiLink > 0)) {
            this.lastSteps = `setArtwork("${song.title ?? song.filename}")`;
            try {
              const art = await this.resolveArtwork(song);
              if (art) {
                await itdb.setArtwork(present.trackId, art);
                session.markDirty();
              }
            } catch (err) {
              console.warn(
                `[IpodSyncStrategy] could not add cover art to "${song.title ?? song.filename}"`,
                err
              );
            }
          }
          summary.alreadyPresent.push(song.id);
          written += 1;
          onProgress?.(written, songs.length, {
            songId: song.id,
            status: "present",
          });
          continue;
        }

        this.lastSteps = `addTrack("${song.title ?? song.filename}")`;

        const bytes = await this.resolveBytes(song);

        if (!bytes) {
          // The audio could not be read (file moved, server unreachable).
          // Skip it and keep syncing the rest, but record it: the caller
          // reports skipped songs and keeps them queued for a retry.
          console.warn(
            `[IpodSyncStrategy] skipping "${song.title ?? song.filename}": audio not available`
          );
          summary.skipped.push(song.id);
          written += 1;
          onProgress?.(written, songs.length, {
            songId: song.id,
            status: "skipped",
          });
          continue;
        }

        // Cover art travels with the track: without it the device shows a
        // blank tile for every song written from here. A device with no
        // artwork formats configured rejects explicit art, so it is only
        // passed when the device can store it, and a failure to read the
        // cover must not cost the track.
        let artwork: Uint8Array | undefined;
        if (canStoreArtwork) {
          try {
            artwork = (await this.resolveArtwork(song)) ?? undefined;
          } catch {
            artwork = undefined;
          }
        }

        const track = await itdb.addTrack(
          this.mapSongToTrackStrings(song),
          new Uint8Array(bytes),
          artwork
        );

        // Commit this song before reporting it. `addTrack` writes the audio
        // file immediately but only adds the record to the in-memory database,
        // so a run interrupted before the final save used to leave orphaned
        // audio on the device with no track pointing at it.
        session.markDirty();
        await session.commit();

        // Take this track back if a later song fails, so a failed run leaves
        // the device as it found it. `removeTrack` also deletes the audio file
        // on save, so the copy is undone too.
        session.onRollback(() => {
          itdb.removeTrack(track.trackId);
        });

        // Confirm the write landed on the device before calling it done: the
        // record has to be in the saved database, and its audio file has to
        // exist on the device. A write that silently did neither used to be
        // reported as synced.
        const recorded = itdb.tracks.some((t) => t.trackId === track.trackId);
        // `track.path` is an iPod location (`:iPod_Control:Music:F03:x.mp3`),
        // but the filesystem port takes `/`-separated paths. Passing the
        // location straight through made `exists` look for one directory
        // literally named ":iPod_Control:Music:F03:x.mp3", so every write was
        // reported as unverified even though it had landed.
        const onDisk = track.path
          ? await fs.exists(ipodLocationToPath(track.path))
          : false;
        const verified = recorded && onDisk;

        existing.set(key, track);
        written += 1;

        if (verified) {
          summary.added.push(song.id);
        } else {
          summary.unverified.push(song.id);
          console.warn(
            `[IpodSyncStrategy] "${song.title ?? song.filename}" was written but not found on the device (record: ${recorded}, file: ${onDisk})`
          );
        }

        onProgress?.(written, songs.length, {
          songId: song.id,
          status: verified ? "verified" : "unverified",
        });
      }

      // -- Playlists -------------------------------------------------------
      // The database only stores a playlist's name as a title data object,
      // and `addPlaylist` does not create one: earlier syncs left a nameless
      // playlist behind on every run. Drop those leftovers.
      for (const leftover of itdb.playlists.filter(
        (p) => !p.isMaster && !p.name && (p.mhsdIndex ?? 2) === 2
      )) {
        itdb.removePlaylist(leftover.playlistId);
        session.markDirty();
      }

      if (playlists.length > 0) {
        // Map by identity for matching on-device tracks to playlist entries.
        const onDevice = new Map(
          itdb.tracks.map((track) => [
            trackIdentity(track.title, track.album, track.artist),
            track.trackId,
          ])
        );

        for (const playlist of playlists) {
          const name =
            typeof playlist.name === "string" ? playlist.name.trim() : "";
          if (!name) continue;

          this.lastSteps = `syncPlaylists("${name}")`;
          let target = itdb.playlists.find(
            (p) => !p.isMaster && p.name === name
          );

          if (!target) {
            target = itdb.addPlaylist(name);
            session.markDirty();
          }

          if (!target.dataObjects.some((o) => o.type === 1 && o.stringValue)) {
            target.dataObjects.push({ type: 1, stringValue: name });
            session.markDirty();
          }

          // Resolve each entry to an on-device track id (skip if absent).
          const items: number[] = [];
          for (const entry of playlist.songs) {
            const meta = await this.resolveSong(entry.songId);
            if (!meta) continue;
            const id = onDevice.get(
              trackIdentity(meta.title, meta.album, meta.artist)
            );
            if (id != null) items.push(id);
          }

          // Clear existing items, then set the new order (adds are
          // idempotent by trackId so re-adding the same id is safe).
          for (const item of target.items) {
            itdb.removeTrackFromPlaylist(item.trackId, target.playlistId);
          }
          for (const id of items) {
            itdb.addTrackToPlaylist(id, target.playlistId);
            session.markDirty();
          }
        }
      }

      // Nothing new: leave the databases untouched rather than rewriting them.
      return session.isDirty();
    });

    return summary;
  }

  /** Load a song by id from the metadata store (title/album/artist for identity). */
  private async resolveSong(songId: string) {
    const metadataStore = getMetadataStore() as CombinedMetadataStore;
    const song = await metadataStore.get(songId);
    if (!song) return null;
    return {
      title: song.title,
      album: song.album,
      artist: song.artist,
    };
  }

  /**
   * Delete tracks from the device by their on-device ids (`SyncTrack.id`,
   * i.e. the iTunesDB trackId).
   */
  async removeTracks(
    device: SyncDevice,
    trackIds: number[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    if (trackIds.length === 0) return;

    await this.withDatabase(device, (itdb) => {
      const knownTrackIds = new Set(itdb.tracks.map((track) => track.trackId));

      let removed = 0;

      for (const [index, trackId] of trackIds.entries()) {
        if (!knownTrackIds.has(trackId)) {
          // Stale id: the track is already gone (removed elsewhere, or the
          // listing predates a rescan). Skipping keeps the rest deleting.
          console.warn(
            `[IpodSyncStrategy] cannot remove track ${trackId}: not on device`
          );
          onProgress?.(index + 1, trackIds.length);
          continue;
        }

        this.lastSteps = `removeTrack(${trackId})`;

        itdb.removeTrack(trackId);
        removed++;

        onProgress?.(index + 1, trackIds.length);
      }

      return removed > 0;
    });
  }

  /**
   * Open the device database, run a unit of work, and persist whatever it
   * leaves unsaved. The work may commit partway through — a song sync commits
   * after every track — and the final commit covers anything after the last
   * one. `using` disposes the handle (closing any open file adapters) even
   * when the work throws.
   */
  private async withDatabase(
    device: SyncDevice,
    work: (
      itdb: Itdb,
      fs: ItdbFileSystem,
      session: DbSession
    ) => boolean | void | Promise<boolean | void>
  ): Promise<void> {
    const root = device.rootHandle;
    if (!root) throw new Error("Device root missing.");

    this.lastSteps = "open";

    const fs = createBrowserFs(root);

    // Rebuild the device from what the detector stored. The FireWire GUID
    // needed by the hash58 checksum is the device's USB serial number —
    // prefer the persisted one (SysInfo is often empty on nano 4G/classic).
    // Itdb.open will also enrich from on-device SysInfo when present.
    const detected =
      device.productId != null ? detectDevice(device.productId) : undefined;
    const guid = device.firewireGuid ?? device.usb?.serialNumber;
    const iPod = detected
      ? {
          ...detected,
          firewireGuid: guid ?? detected.firewireGuid,
          serialNumber: device.serialNumber ?? detected.serialNumber,
        }
      : undefined;

    const itdb = await Itdb.open(fs, { device: iPod });

    const session = createDbSession(async () => {
      this.lastSteps = "save()";
      await itdb.save();
    });

    try {
      const changed = await work(itdb, fs, session);

      if (changed === false) return;

      await session.commit();
    } catch (err) {
      console.error(`[IpodSyncStrategy] failed at ${this.lastSteps}`, err);

      // Undo what this run wrote, then persist the undo. A device left with
      // half a sync is worse than one left untouched.
      try {
        await session.rollback();
        session.markDirty();
        await session.commit();
      } catch (rollbackError) {
        console.error(
          `[IpodSyncStrategy] rollback failed at ${this.lastSteps}`,
          rollbackError
        );
      }

      // Rethrow the original error rather than a copy: a cancelled run is
      // detected by `instanceof` in the worker, and wrapping it in a plain
      // Error turned a cancel into a reported failure.
      if (err instanceof Error) {
        err.message = `[IpodSyncStrategy] ${err.name}: ${err.message} (step: ${this.lastSteps})`;
        throw err;
      }

      throw new Error(
        `[IpodSyncStrategy] ${String(err)} (step: ${this.lastSteps})`
      );
    } finally {
      itdb[Symbol.dispose]();
    }
  }

  /** Last step label, used to pinpoint where a sync failed. */
  private lastSteps = "open";

  private mapSongToTrackStrings(song: Song): TrackMeta {
    return {
      title: song.title ?? "Untitled Song",
      album: song.album,
      artist: song.artist,
      genre: song.genre,
      comment: song.comment,
      composer: song.composer,
      albumArtist: song.albumArtist,
      year: song.year,
      bitrate: song.bitrate,
      trackNumber: song.track,
      trackTotal: song.totalTracks,
      discNumber: song.discNumber,
      discTotal:
        typeof song.totalDiscs === "number" ? song.totalDiscs : undefined,
    };
  }
}
