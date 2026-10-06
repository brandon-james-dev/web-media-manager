import type { Song, SyncDevice } from "@/models";
import type { ISyncStrategy } from "./ISyncStrategy";
import { copyIpodTrack } from "@ipod-db";
import { getMetadataStore } from "@/lib/file-utils";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";

export class IpodSyncStrategy implements ISyncStrategy {
  canHandle(device: SyncDevice): boolean {
    return device.type === "iPod";
  }

  async syncSongs(device: SyncDevice, songs: Song[]): Promise<void> {
    for (const song of songs) {
      await this.copySong(device, song);
    }
  }

  private async copySong(device: SyncDevice, song: Song) {
    const root = device.rootHandle;

    if (!root) {
      throw new Error("Device root missing.");
    }

    const store = getMetadataStore() as CombinedMetadataStore;
    const fileHandle = await store.getFileSystem().getFileHandle(song.id);
    const file = await fileHandle?.getFile();

    if (!file) {
      throw new Error(`The file "${song.filename}" was not found`);
    }

    await copyIpodTrack(root, file);
  }
}
