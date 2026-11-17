import type { Table } from "dexie";

import type {
  PackageFileRecord,
  PackageFileStore,
} from "@/core/ports/packageFiles";

/**
 * Dexie-backed {@link PackageFileStore} over any table indexed by `ownerId`
 * and `[ownerId+path]`. Each package kind passes its own table.
 *
 * @example
 * ```xml
 * <Face src="assets/fonts/body.woff2" weight="400" />
 * ```
 * @example
 * ```ts
 * const files = new DexiePackageFileStore(getWmmMusicDb().themeFiles);
 * await files.getFile("classic-blue", "assets/fonts/body.woff2");
 * ```
 */
export class DexiePackageFileStore implements PackageFileStore {
  private readonly table: Table<PackageFileRecord, number>;

  constructor(table: Table<PackageFileRecord, number>) {
    this.table = table;
  }

  async listFiles(ownerId: string): Promise<PackageFileRecord[]> {
    return this.table.where("ownerId").equals(ownerId).toArray();
  }

  async getFile(
    ownerId: string,
    path: string
  ): Promise<PackageFileRecord | undefined> {
    return this.table.where("[ownerId+path]").equals([ownerId, path]).first();
  }

  async putFiles(files: PackageFileRecord[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    await this.table.bulkPut(files);
  }

  async deleteFiles(ownerId: string): Promise<void> {
    await this.table.where("ownerId").equals(ownerId).delete();
  }
}
