import type { SyncDevice, Song } from "@/models";
import type { ISyncStrategy } from "./ISyncStrategy";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { getMetadataStore } from "@/lib/initMetadataStore";
import {
  detectDevice,
  Itdb,
  createBrowserFs,
  type TrackMeta,
} from "itunesdb-ts";
import { trackIdentity } from "../helpers";

export class IpodSyncStrategy implements ISyncStrategy {
  canHandle(device: SyncDevice): boolean {
    return device.type === "iPod";
  }

  /**
   * Add songs to the device. Additive: tracks already on the device are left
   * alone, and tracks not in the queue are never removed (use
   * {@link removeTracks} for that).
   */
  async sync(device: SyncDevice, songs: Song[]): Promise<void> {
    await this.withDatabase(device, async (itdb) => {
      const metadataStore = getMetadataStore() as CombinedMetadataStore;

      const existing = new Set<string>();
      for (const track of itdb.tracks) {
        existing.add(trackIdentity(track.title, track.album, track.artist));
      }

      let added = 0;

      for (const song of songs) {
        const key = trackIdentity(song.title, song.album, song.artist);

        if (existing.has(key)) continue; // already on device — preserve it

        this.lastSteps = `addTrack("${song.title ?? song.filename}")`;

        const fileHandle = await metadataStore
          .getFileSystem()
          .getFileHandle(song.id);

        if (!fileHandle) {
          // Song is visible in the browser but its audio file isn't in the
          // metadata store — skip it and keep syncing the remaining songs
          // instead of aborting the whole batch.
          console.warn(
            `[IpodSyncStrategy] skipping "${song.filename ?? song.title}": audio file not available`
          );
          continue;
        }

        const file = await fileHandle.getFile();
        const trackBytes = new Uint8Array(await file.arrayBuffer());

        await itdb.addTrack(this.mapSongToTrackStrings(song), trackBytes);

        existing.add(key);
        added++;
      }

      // Nothing new: leave the databases untouched rather than rewriting them.
      if (added === 0) return false;

      return true;
    });
  }

  /**
   * Delete tracks from the device by their on-device ids (`SyncTrack.id`,
   * i.e. the iTunesDB trackId).
   */
  async removeTracks(device: SyncDevice, trackIds: number[]): Promise<void> {
    if (trackIds.length === 0) return;

    await this.withDatabase(device, (itdb) => {
      const knownTrackIds = new Set(itdb.tracks.map((track) => track.trackId));

      let removed = 0;

      for (const trackId of trackIds) {
        if (!knownTrackIds.has(trackId)) {
          // Stale id: the track is already gone (removed elsewhere, or the
          // listing predates a rescan). Skipping keeps the rest deleting.
          console.warn(
            `[IpodSyncStrategy] cannot remove track ${trackId}: not on device`
          );
          continue;
        }

        this.lastSteps = `removeTrack(${trackId})`;

        itdb.removeTrack(trackId);
        removed++;
      }

      return removed > 0;
    });
  }

  /**
   * Open the device database, run a unit of work, and persist it only when
   * the work reports a change. `using` disposes the handle (closing any open
   * file adapters) even when the work throws.
   */
  private async withDatabase(
    device: SyncDevice,
    work: (itdb: Itdb) => boolean | void | Promise<boolean | void>
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

    using itdb = await Itdb.open(fs, { device: iPod });

    try {
      const changed = await work(itdb);

      if (changed === false) return;

      this.lastSteps = "save()";
      await itdb.save();
    } catch (err) {
      const name = err instanceof Error ? err.name : typeof err;
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? (err.stack ?? "") : "";

      console.error(`[IpodSyncStrategy] failed at ${this.lastSteps}`, err);

      const enriched = new Error(
        `[IpodSyncStrategy] ${name}: ${message} (step: ${this.lastSteps})`
      );
      enriched.name = name;
      enriched.stack = stack;

      throw enriched;
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
      discTotal: song.totalDiscs,
    };
  }
}
