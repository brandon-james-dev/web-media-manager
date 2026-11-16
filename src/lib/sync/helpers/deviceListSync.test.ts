import { describe, expect, it } from "vitest";
import type { SyncDevice } from "@/models";
import { createDeviceListSync } from "./deviceListSync";

function device(id: string): SyncDevice {
  return { id, name: id, connected: true } as SyncDevice;
}

/**
 * A refresh that started before an add must not discard the added device.
 *
 * `refreshDevices` replaced the whole list with a scan snapshot. When that scan
 * began before `addDevice` appended the picked device, its stale snapshot
 * resolved afterwards and removed the row — the device looked like it was never
 * added until the next scan picked it up.
 */
describe("createDeviceListSync", () => {
  it("discards a refresh whose snapshot predates an add", async () => {
    let devices: SyncDevice[] = [];
    const sync = createDeviceListSync((next) => {
      devices = next;
    });

    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));

    // The scan reads an empty list, then waits.
    const refresh = sync.refresh(async () => {
      await gate;
      return [];
    });

    // The add lands while the scan is in flight.
    sync.markMutation();
    devices = [device("zune-120")];

    release();
    const applied = await refresh;

    expect(applied).toBe(false);
    expect(devices.map((d) => d.id)).toEqual(["zune-120"]);
  });

  it("applies a refresh when nothing changed while it ran", async () => {
    let devices: SyncDevice[] = [];
    const sync = createDeviceListSync((next) => {
      devices = next;
    });

    const applied = await sync.refresh(async () => [device("zune-8")]);

    expect(applied).toBe(true);
    expect(devices.map((d) => d.id)).toEqual(["zune-8"]);
  });

  it("applies a refresh that starts after a mutation", async () => {
    let devices: SyncDevice[] = [];
    const sync = createDeviceListSync((next) => {
      devices = next;
    });

    sync.markMutation();
    const applied = await sync.refresh(async () => [device("zune-8")]);

    expect(applied).toBe(true);
    expect(devices.map((d) => d.id)).toEqual(["zune-8"]);
  });
});
