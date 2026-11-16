import { describe, expect, it } from "vitest";
import type { SyncDevice } from "@/models";
import {
  hasConnectedDevice,
  markDeviceDisconnected,
} from "./markDeviceDisconnected";

function device(id: string, serialNumber: string, connected = true): SyncDevice {
  return {
    id,
    name: id,
    createdAt: 0,
    type: "zune",
    connected,
    usb: {
      vendorId: 0x045e,
      productId: 0x0710,
      serialNumber,
      manufacturerName: "Microsoft",
      productName: "Zune",
    },
    media: { tracks: [], playlists: [], artworks: [] },
    capabilities: {
      database: true,
      artwork: false,
      playlists: false,
      playbackStats: false,
    },
  } as SyncDevice;
}

describe("markDeviceDisconnected", () => {
  it("clears the connected flag on the unplugged device only", () => {
    const devices = [device("zune-8", "S1"), device("zune-hd", "S2")];

    const next = markDeviceDisconnected(devices, "S1");

    expect(next.map((d) => [d.id, d.connected])).toEqual([
      ["zune-8", false],
      ["zune-hd", true],
    ]);
  });

  it("keeps the device in the list so it can be shown as offline", () => {
    const next = markDeviceDisconnected([device("zune-8", "S1")], "S1");

    expect(next).toHaveLength(1);
  });

  it("leaves the list untouched when the event carries no serial", () => {
    const devices = [device("zune-8", "S1")];

    expect(markDeviceDisconnected(devices, undefined)).toBe(devices);
  });
});

/**
 * The Sync page hid "Add Device" whenever any row existed. Because an
 * unplugged device keeps its row, the button stayed hidden and a device could
 * only be added once that row was gone.
 */
describe("hasConnectedDevice", () => {
  it("is false once the only device is unplugged, so Add Device returns", () => {
    const afterUnplug = markDeviceDisconnected([device("zune-8", "S1")], "S1");

    expect(afterUnplug).toHaveLength(1);
    expect(hasConnectedDevice(afterUnplug)).toBe(false);
  });

  it("is true while any device is still plugged in", () => {
    const devices = [device("zune-8", "S1", false), device("zune-hd", "S2")];

    expect(hasConnectedDevice(devices)).toBe(true);
  });

  it("is false for an empty list", () => {
    expect(hasConnectedDevice([])).toBe(false);
  });
});
