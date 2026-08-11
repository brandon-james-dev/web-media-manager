import { TagLibMetadataWriter } from "../taglib-metadata-utils";
import type { IMetadataStore } from "../metadata-utils/IMetadataStore";
import type { IMetadataWriteStrategy } from "../metadata-utils/IMetadataWriteStrategy";
import type { ITagData } from "../metadata-utils/ITagData";
import type { Song } from "@/models/Song";

export class FileWriteStrategy implements IMetadataWriteStrategy {
  private store: IMetadataStore;

  constructor(store: IMetadataStore) {
    this.store = store;
  }

  async write(id: string, updated: Partial<ITagData>): Promise<Song> {
    const song = await this.store.getSong(id);
    if (!song) {
      throw new Error(`Song ${id} not found`);
    }

    if (!song.fileHandle) {
      throw new Error(`Song ${id} missing fileHandle`);
    }

    const file = await song.fileHandle.getFile();

    const writer = new TagLibMetadataWriter();
    const updatedBytes = await writer.writeTags(file, updated);

    const writable = await song.fileHandle.createWritable();
    await writable.write(updatedBytes.slice().buffer);
    await writable.close();

    const updatedSong: Song = {
      ...song,
      ...updated,
    };

    await this.store.saveSong(id, updatedSong);

    return updatedSong;
  }
}
