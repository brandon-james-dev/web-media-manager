import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `loadPersistedDevices` shows only devices that are physically connected.
 * For a Zune it skipped that check entirely — `if (!record.rootHandle) return
 * record.type === "zune"` — so every Zune ever added was restored whether or
 * not it was plugged in, and each unplugged one produced a failed MTP scan and
 * a `[SyncService] Unable to read ...` warning on every page load.
 */

const h = vi.hoisted(() => ({
  records: [] as unknown[],
  restored: [] as string[],
}));

vi.mock("../persistence/dexie/DexieSyncDeviceStore", () => ({
  DexieSyncDeviceStore: class {
    async getAll() {
      return h.records;
    }
  },
}));

vi.mock("./helpers", () => ({
  mapSyncDeviceToRecord: (device: unknown) => device,
  waitForMount: async () => undefined,
  restoreSyncDevice: async (record: { id: string; name: string }) => {
    h.restored.push(record.id);
    return { id: record.id, name: record.name, type: "zune" };
  },
}));

const { SyncService } = await import("./SyncService");

function zuneRecord(id: string, serialNumber: string) {
  return {
    id,
    name: "Zune 8",
    type: "zune",
    usb: {
      vendorId: 0x045e,
      productId: 0x0710,
      serialNumber,
      manufacturerName: "Microsoft",
      productName: "Zune",
    },
  };
}

describe("SyncService.loadPersistedDevices", () => {
  beforeEach(() => {
    h.records = [];
    h.restored = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores only the Zune whose serial is still enumerated", async () => {
    h.records = [
      zuneRecord("plugged", "c80291cc-ca81-b58b-82d8-26eeadcc0ce8"),
      zuneRecord("unplugged", "11111111-2222-3333-4444-555555555555"),
    ];

    vi.stubGlobal("navigator", {
      usb: {
        getDevices: async () => [
          { serialNumber: "c80291cc-ca81-b58b-82d8-26eeadcc0ce8" },
        ],
      },
    });

    const devices = await new SyncService().loadPersistedDevices();

    expect(h.restored).toEqual(["plugged"]);
    expect(devices.map((device) => device.id)).toEqual(["plugged"]);
  });
});
