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
  async write(id: string, updated: Partial<Song>): Promise<Song> {
    // Let the metadata store handle persistence + event emission
    const existing = await this.store.get(id);
    const merged: Song = {
      id,
      sourceId: existing?.sourceId ?? updated.sourceId ?? "",
      relativePath: existing?.relativePath ?? updated.relativePath ?? "",
      filename: existing?.filename ?? updated.filename ?? "",
      filesize: existing?.filesize ?? updated.filesize ?? 0,
      ...existing,
      ...updated,
    };
    return await this.store.save(id, merged);
  }

  /**
   * Deletes metadata from Dexie.
   */
  async delete(id: string): Promise<void> {
    return await this.store.delete(id);
  }
}
