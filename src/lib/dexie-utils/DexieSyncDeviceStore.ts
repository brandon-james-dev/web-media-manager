import type { SyncDeviceRecord } from "@/models";
import { getMetadataDb } from "./MetadataDb";
import type { DataChangedCallback, IRepository, QueryOptions } from "../store";
import type { DataSourceResult } from "../store/DataSourceResult";

export class DexieSyncDeviceStore implements IRepository<SyncDeviceRecord> {
  private readonly db = getMetadataDb();

  async get(id: string): Promise<SyncDeviceRecord | null> {
    return (await this.db.syncDevices.get(id)) ?? null;
  }

  async save(id: string, updated: SyncDeviceRecord): Promise<SyncDeviceRecord> {
    await this.db.syncDevices.put({
      ...updated,
      id,
    });

    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.syncDevices.delete(id);
  }

  async getAll(): Promise<SyncDeviceRecord[]> {
    return this.db.syncDevices.toArray();
  }

  async filter(
    options: QueryOptions<SyncDeviceRecord>
  ): Promise<DataSourceResult<SyncDeviceRecord>> {
    let items = await this.db.syncDevices.toArray();
    const total = items.length;

    if (options.filter) {
      items = items.filter(options.filter);
    }

    const filteredCount = items.length;
    const skip = options.skip ?? 0;
    const take = options.take ?? filteredCount;

    return {
      data: items.slice(skip, skip + take),
      filteredCount,
      total,
    };
  }

  async batchDelete(ids: string[]): Promise<void> {
    await this.db.transaction("rw", this.db.syncDevices, async () => {
      await this.db.syncDevices.bulkDelete(ids);
    });
  }

  async batchUpdate(
    items: {
      id: string;
      updated: SyncDeviceRecord;
    }[]
  ): Promise<void> {
    await this.db.transaction("rw", this.db.syncDevices, async () => {
      await this.db.syncDevices.bulkPut(
        items.map(({ id, updated }) => ({
          ...updated,
          id,
        }))
      );
    });
  }

  async clearStore(): Promise<void> {
    await this.db.syncDevices.clear();
  }

  onAdded(_cb: DataChangedCallback<SyncDeviceRecord>): () => void {
    return () => {};
  }

  onUpdated(_cb: DataChangedCallback<SyncDeviceRecord>): () => void {
    return () => {};
  }

  onDeleted(_cb: DataChangedCallback<SyncDeviceRecord>): () => void {
    return () => {};
  }

  onStoreCleared(_cb: () => void): () => void {
    return () => {};
  }
}
