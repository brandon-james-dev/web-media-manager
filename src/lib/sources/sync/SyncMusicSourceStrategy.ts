import type { MusicSource, Playlist, Song } from "@/models";
import type { MusicSourceKind } from "@/core/contracts";
import { isSyncSource } from "@/core/contracts/sources";
import type { IMusicSourceStrategy, IJobHandle } from "../IMusicSourceStrategy";
import { usbAvailable } from "@/lib/sync/usbAvailable";

/**
 * A portable device as a music source.
 *
 * The device is a source so the Sync page can list it beside every other
 * writable source, but it is not part of the combined library: `collectSongs`
 * returns nothing, so its tracks are never imported as songs and it never
 * shows up in Songs, Albums, Artists or the source filter. Reading and
 * writing the device stays with `SyncService` and the `ISyncStrategy`
 * writers, which own the per-format details (iTunesDB, MTP, ...).
 */
export class SyncMusicSourceStrategy implements IMusicSourceStrategy {
  readonly kind: MusicSourceKind = "sync";
  readonly name = "Sync device";
  readonly description =
    "A portable player such as an iPod, used as a sync target.";
  readonly requiresConfig = false;

  /** Devices need WebUSB to be enumerated. */
  get isAvailable(): boolean {
    return usbAvailable();
  }

  /**
   * Devices are attached through the Sync page's device picker, which needs
   * its own user gestures (USB, then folder). There is no config form that
   * could add one, so this is not reachable from "add a music source".
   */
  async add(): Promise<void> {
    throw new Error(
      "Sync devices are added from the Sync page, not the source picker."
    );
  }

  /**
   * Read a track's audio back off the device.
   *
   * A device track is a real file under the device root, so playback resolves
   * it the same way a local folder's song is resolved: walk the path from the
   * root handle and read the file. Returning null here meant a device track
   * could be listed and synced but never played.
   */
  async resolveSongBytes(song: Song): Promise<ArrayBuffer | null> {
    if (!song.relativePath) return null;

    const { getSourcesStore } = await import("@/core/ports");
    const sources = await getSourcesStore().getSources();
    const source = sources.find((entry) => entry.id === song.sourceId);

    if (!source || !isSyncSource(source) || !source.rootHandle) return null;

    try {
      const segments = song.relativePath.split("/").filter(Boolean);
      const fileName = segments.pop();
      if (!fileName) return null;

      let directory = source.rootHandle;
      for (const segment of segments) {
        directory = await directory.getDirectoryHandle(segment);
      }

      const handle = await directory.getFileHandle(fileName);
      const file = await handle.getFile();
      return await file.arrayBuffer();
    } catch (error) {
      console.warn(
        `[SyncMusicSourceStrategy] Could not read "${song.relativePath}":`,
        error
      );
      return null;
    }
  }

  /**
   * Re-read the device's library so its card reflects what is on it now.
   * Delegates to the sync service, which owns device I/O.
   */
  async sync(options: {
    source: MusicSource;
    silent?: boolean;
  }): Promise<IJobHandle | null> {
    if (!isSyncSource(options.source)) return null;

    const { SyncService } = await import("@/lib/sync/SyncService");
    await new SyncService().refreshSource(options.source);

    return null;
  }

  cancelSync(): void {
    // Device rescans are short and not cancellable today.
  }

  async removeSource(options: {
    source: MusicSource;
    onSourceRemoved?: () => void | Promise<void>;
  }): Promise<void> {
    const { getSourcesStore } = await import("@/core/ports");
    await getSourcesStore().deleteSource(options.source.id);
    await options.onSourceRemoved?.();
  }

  /** Devices are sync targets only — nothing is imported into the library. */
  async collectSongs(): Promise<Song[]> {
    return [];
  }

  /** Devices hold no playlists of their own to import. */
  async collectPlaylists(): Promise<Playlist[] | null> {
    return null;
  }

  async resolvePictureBytes(): Promise<Uint8Array | null> {
    return null;
  }
}
