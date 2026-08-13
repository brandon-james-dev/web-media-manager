import type { Song } from "@/models/Song";
import type { DexieMetadataStore } from "./DexieMetadataStore";

export class DexieWriteStrategy {
  private store: DexieMetadataStore;

  constructor(store: DexieMetadataStore) {
    this.store = store;
  }

  /**
   * Writes metadata to Dexie.
   * This does NOT write tags to the file.
   */
  async write(id: string, updated: Song): Promise<Song> {
    // Let the metadata store handle persistence + event emission
    return await this.store.saveSong(id, updated);
  }

  /**
   * Deletes metadata from Dexie.
   */
  async delete(id: string): Promise<void> {
    return await this.store.deleteSong(id);
  }
}
