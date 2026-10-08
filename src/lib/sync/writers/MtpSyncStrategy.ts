import { getMetadataStore } from "@/lib/file-utils";
import type { ISyncStrategy } from "./ISyncStrategy";
import type { Song, SyncDevice } from "@/models";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";

export class MtpSyncStrategy implements ISyncStrategy {
  canHandle(device: SyncDevice): boolean {
    return device.type === "mtp";
  }

  async sync(device: SyncDevice, songs: Song[]): Promise<void> {
    const musicFolder = await this.getMusicFolder(device);

    for (const song of songs) {
      await this.copySong(musicFolder, song);
    }
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
