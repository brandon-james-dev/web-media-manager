import { getMetadataStore } from "@/lib/persistence/file";
import type { ISyncStrategy, SyncSummary } from "./ISyncStrategy";
import type { Song, SyncDevice } from "@/models";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";

export class MtpSyncStrategy implements ISyncStrategy {
  canHandle(device: SyncDevice): boolean {
    return device.type === "mtp";
  }

  /**
   * Copy songs into the device's music folder.
   *
   * Plain MTP has no library database of its own — the device indexes the
   * files it finds — so there is nothing to commit per song and no
   * {@link DbSession} here. Each file is complete once `close()` returns.
   */
  async sync(device: SyncDevice, songs: Song[]): Promise<SyncSummary> {
    const musicFolder = await this.getMusicFolder(device);

    for (const song of songs) {
      await this.copySong(musicFolder, song);
    }

    // MTP has no library to compare against, so every song is a write.
    return {
      added: songs.map((s) => s.id),
      unverified: [],
      alreadyPresent: [],
      skipped: [],
    };
  }

  private async getMusicFolder(
    device: SyncDevice
  ): Promise<FileSystemDirectoryHandle> {
    const root = device.rootHandle;

    if (!root) throw new Error("The root folder is unavailable");

    try {
      return await root.getDirectoryHandle("Music");
    } catch {
      return await root.getDirectoryHandle("music");
    }
  }

  private async copySong(
    target: FileSystemDirectoryHandle,
    song: Song
  ): Promise<void> {
    const metadataStore = getMetadataStore() as CombinedMetadataStore;

    const songFileHandle = await metadataStore
      .getFileSystem()
      .getFileHandle(song.id);
    if (!songFileHandle)
      throw new Error(`File not available for "${song.filename}"`);

    const file = await songFileHandle.getFile();
    const handle = await target.getFileHandle(file.name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(await file.arrayBuffer());

    await writable.close();
  }
}
