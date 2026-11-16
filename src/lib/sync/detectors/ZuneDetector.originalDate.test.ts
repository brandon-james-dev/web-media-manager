import { describe, expect, it, vi } from "vitest";

/**
 * A device that does not support `OriginalDate` must be asked once, not once
 * per track.
 *
 * A Zune 120 either rejects `GetObjectPropValue(OriginalDate)` with `0xa801` or
 * never answers at all, which the protocol surfaces as `MTP_TIMEOUT`. The read
 * is serialized, so asking per track cost a full 15 s timeout each: four tracks
 * meant a minute of the device sitting on "syncing..." before it was added as a
 * source. The detector now probes once and skips the remaining reads.
 */

const h = vi.hoisted(() => ({ state: { reads: 0 } }));

vi.mock("zunesync-ts", () => {
  class FakeZune {
    static async open() {
      return new FakeZune();
    }

    get model() {
      return { name: "Zune 120", family: "classic" };
    }

    get storageInfo() {
      return undefined;
    }

    async readDatabase() {
      return {
        tracks: [1, 2, 3, 4].map((n) => ({
          atomId: 0x1000017 + n,
          title: `Track ${n}`,
          artist: "Creed",
          album: "Human Clay",
          albumArtist: "Creed",
          genre: "Hard Rock",
          trackNumber: 1,
          discNumber: 0,
          duration: 316000,
          size: 5117785,
          playcount: 0,
          rating: 0,
          codecId: 0x3009,
          filename: `${n}.mp3`,
          albumRef: 1,
        })),
        albums: { 1: { atomId: 1, title: "Human Clay", artistName: "Creed" } },
        artists: {},
        genres: {},
        playlists: [],
      };
    }

    async getObjectInfo() {
      return { compressedSize: 5117785, filename: "1.mp3" };
    }

    async getObjectPropUint32() {
      return 316000;
    }

    // Mirrors the protocol's bounded read: it rejects with MTP_TIMEOUT rather
    // than waiting the real 15 s.
    async getObjectPropString() {
      h.state.reads += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      const error = new Error("No response from the device within 15000ms");
      (error as unknown as { code: string }).code = "MTP_TIMEOUT";
      (error as unknown as { params: number[] }).params = [];
      throw error;
    }

    async readAlbumArtwork() {
      return undefined;
    }

    async listObjects() {
      return [];
    }

    async disconnect() {}
  }

  return {
    Zune: FakeZune,
    ZUNE_VENDOR_ID: 0x045e,
    isZuneProductId: (id: number) => id === 0x0710,
    detectDevice: () => ({ name: "Zune 120", family: "classic" }),
    ObjectProperty: { Duration: 0xda00, OriginalDate: 0xdc07 },
  };
});

const { ZuneDetector } = await import("./ZuneDetector");

const usb = {
  vendorId: 0x045e,
  productId: 0x0710,
  serialNumber: "SN",
  productName: "Zune 120",
};

function installUsbDevice() {
  Object.defineProperty(globalThis, "navigator", {
    value: {
      usb: {
        getDevices: async () => [
          {
            vendorId: 0x045e,
            productId: 0x0710,
            serialNumber: "SN",
            opened: false,
            configuration: {
              configurationValue: 1,
              interfaces: [
                {
                  interfaceNumber: 0,
                  claimed: false,
                  alternate: {
                    interfaceClass: 0x06,
                    endpoints: [
                      { type: "bulk", direction: "out", endpointNumber: 1 },
                      { type: "bulk", direction: "in", endpointNumber: 2 },
                    ],
                  },
                },
              ],
            },
            configurations: [{ configurationValue: 1 }],
            async open() {
              this.opened = true;
            },
            async selectConfiguration() {},
            async claimInterface() {},
            async releaseInterface() {},
            async close() {
              this.opened = false;
            },
          },
        ],
      },
    },
    configurable: true,
    writable: true,
  });
}

describe("ZuneDetector OriginalDate probing", () => {
  it("never issues the unsupported read", async () => {
    h.state.reads = 0;
    installUsbDevice();

    const started = Date.now();
    const device = await new ZuneDetector().detect(undefined, usb as never);
    const elapsed = Date.now() - started;

    // Issuing the read at all wedges the session: the transport cannot cancel
    // it, so every later transfer fails until the device is unplugged.
    expect(h.state.reads).toBe(0);
    expect(elapsed).toBeLessThan(5000);
    // The year is simply unknown on this device; the tracks still come through.
    expect(device?.media?.tracks).toHaveLength(4);
    expect(device?.media?.tracks.every((track) => track.year === undefined)).toBe(
      true
    );
  }, 20000);
});
