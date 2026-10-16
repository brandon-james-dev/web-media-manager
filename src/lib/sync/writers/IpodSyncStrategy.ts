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

export class IpodSyncStrategy implements ISyncStrategy {
  canHandle(device: SyncDevice): boolean {
    return device.type === "iPod";
  }

  async sync(device: SyncDevice, songs: Song[]): Promise<void> {
    if (!device && !songs)
      throw new Error("There was no device or songs selected to sync to it!");
    const root = device.rootHandle;
    if (!root) throw new Error("Device root missing.");

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

    const metadataStore = getMetadataStore() as CombinedMetadataStore;
    const existingByKey = new Set<string>();
    for (const t of itdb.tracks) {
      existingByKey.add(`${t.title ?? ""}\u0000${t.album ?? ""}\u0000${t.artist ?? ""}`);
    }
    try {
      for (const song of songs) {
        const songKey = `${song.title ?? ""}\u0000${song.album ?? ""}\u0000${song.artist ?? ""}`;
        if (existingByKey.has(songKey)) continue; // already on device — preserve, don't duplicate
        existingByKey.add(songKey);
        this.lastSteps = `addTrack("${song.title ?? song.filename}")`;
        const fileHandle = await metadataStore
          .getFileSystem()
          .getFileHandle(song.id);
        if (!fileHandle) {
          // Song is visible in the browser but its audio file isn't in the
          // metadata store — skip it and keep syncing the remaining songs
          // instead of aborting the whole batch.
          console.warn(
            `[IpodSyncStrategy] skipping "${song.filename ?? song.title}": audio file not available`,
          );
          continue;
        }
        const file = await fileHandle.getFile();
        const trackBytes = new Uint8Array(await file.arrayBuffer());
        await itdb.addTrack(this.mapSongToTrackStrings(song), trackBytes);
      }
      this.lastSteps = "prune removed songs";
      const queued = new Set(
        songs.map((s) => `${s.title ?? ""}\u0000${s.album ?? ""}\u0000${s.artist ?? ""}`),
      );
      for (const track of [...itdb.tracks]) {
        const key = `${track.title ?? ""}\u0000${track.album ?? ""}\u0000${track.artist ?? ""}`;
        if (!queued.has(key)) await itdb.removeTrack(track.trackId);
      }
      this.lastSteps = "save()";
      await itdb.save();
    } catch (err) {
      const name = err instanceof Error ? err.name : typeof err;
      const message = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? (err.stack ?? "") : "";
      console.error(`[IpodSyncStrategy] sync failed at ${this.lastSteps}`, err);
      const enriched = new Error(
        `[IpodSyncStrategy] ${name}: ${message} (step: ${this.lastSteps})`,
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
