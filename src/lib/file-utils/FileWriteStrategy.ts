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

    const updatedSong: Song = {
      ...song,
      ...updated,
    };

    await this.store.saveSong(id, updatedSong);

    return updatedSong;
  }
}
