import type { SyncDeviceRecord } from "@/models";
import type { SyncMusicSource } from "@/core/contracts/sources";
import { getWmmMusicDb } from "./WmmMusicDb";

/**
 * Device records, stored as `sources` rows with kind "sync".
 *
 * Devices used to have their own table; they are sources now (see the Dexie
 * v3 migration), so this reads and writes the sources table and keeps the
 * `SyncDeviceRecord` shape the sync service already speaks.
 */
export class DexieSyncDeviceStore {
  private readonly db = getWmmMusicDb();

  /** Map a sync source row back to the device record shape. */
  private toRecord(source: SyncMusicSource): SyncDeviceRecord {
    return {
      id: source.id,
      name: source.name,
      createdAt: source.createdAt.getTime(),
      productId: source.productId,
      usb: source.usb,
      firewireGuid: source.firewireGuid,
      serialNumber: source.serialNumber,
      type: source.type,
      rootHandle: source.rootHandle,
    };
  }

  async get(id: string): Promise<SyncDeviceRecord | null> {
    const source = await this.db.sources.get(id);
    if (!source || source.kind !== "sync") return null;
    return this.toRecord(source);
  }

  async getAll(): Promise<SyncDeviceRecord[]> {
    const sources = await this.db.sources.toArray();
    return sources
      .filter((source): source is SyncMusicSource => source.kind === "sync")
      .map((source) => this.toRecord(source));
  }

  async save(id: string, record: SyncDeviceRecord): Promise<SyncDeviceRecord> {
    const existing = await this.db.sources.get(id);

    // Preserve the source fields a device record does not carry (priority,
    // capabilities, uriDomain) when the row already exists.
    const base: SyncMusicSource =
      existing && existing.kind === "sync"
        ? existing
        : {
            id,
            kind: "sync",
            uriDomain: "sync",
            name: record.name,
            enabled: true,
            createdAt: new Date(record.createdAt),
            priority: 50,
            capabilities: {
              streaming: false,
              browsing: false,
              searching: false,
              metadataWrite: false,
              libraryScanning: false,
              playlistWrite: false,
              syncWrite: true,
              offline: false,
            },
            type: record.type,
          };

    await this.db.sources.put(
      {
        ...base,
        id,
        name: record.name,
        type: record.type,
        productId: record.productId,
        serialNumber: record.serialNumber,
        firewireGuid: record.firewireGuid,
        usb: record.usb,
        rootHandle: record.rootHandle,
      },
      id
    );

    return record;
  }

  async delete(id: string): Promise<void> {
    await this.db.sources.delete(id);
  }
}
