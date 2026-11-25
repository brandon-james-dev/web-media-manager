import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A Zune is an MTP device: it has no mountable filesystem, so detection keys
 * on the USB descriptors and the library comes from the device's ZMDB.
 */

const h = vi.hoisted(() => ({
  state: {
    library: {
      tracks: [] as unknown[],
      albums: {},
      artists: {},
      genres: {},
      videos: [],
      pictures: [],
      playlists: [] as unknown[],
      podcastShows: [],
      podcastEpisodes: [],
    },
    storage: { maxCapacity: 32_000_000_000n, freeSpaceInBytes: 8_000_000_000n },
    deviceInfo: { model: "Zune HD" },
    model: undefined as unknown,
    disconnected: false,
    usbDevice: {} as unknown,
    objectSizes: {} as Record<number, number>,
    objectFilenames: {} as Record<number, string>,
    atomIdsAreHandles: true,
    albumArtwork: {} as Record<number, Uint8Array | undefined>,
    objectStrings: {} as Record<string, string>,
    objectStringReads: 0,
    objectInfoHandles: [] as number[],
    objectProps: {} as Record<string, number>,
  },
}));

vi.mock("zunesync-ts", () => {
  class FakeZune {
    static async open() {
      return new FakeZune();
    }

    get storageInfo() {
      return h.state.storage;
    }

    get deviceInfo() {
      return h.state.deviceInfo;
    }

    get model() {
      return h.state.model;
    }

    async readDatabase() {
      return h.state.library;
    }

    async getObjectInfo(handle: number) {
      if (h.state.atomIdsAreHandles === false && handle < 0x1000) {
        throw new Error("Invalid object handle");
      }
      h.state.objectInfoHandles.push(handle);
      return {
        storageId: 0x00010001,
        objectFormat: 0x3009,
        protectionStatus: 0,
        compressedSize: h.state.objectSizes[handle] ?? 0,
        parentObject: 0,
        filename: h.state.objectFilenames[handle] ?? "",
      };
    }

    async listObjects() {
      return Object.keys(h.state.objectSizes).map(Number);
    }

    async readAlbumArtwork(handle: number) {
      return h.state.albumArtwork[handle];
    }

    async getObjectPropString(handle: number, propCode: number) {
      h.state.objectStringReads += 1;
      return h.state.objectStrings[`${handle}:${propCode}`] ?? "";
    }

    async getObjectPropUint32(handle: number, propCode: number) {
      return h.state.objectProps[`${handle}:${propCode}`] ?? 0;
    }

    async disconnect() {
      h.state.disconnected = true;
    }
  }

  return {
    Zune: FakeZune,
    ObjectProperty: { Duration: 0xdc89, OriginalDate: 0xdc99 },
    ZUNE_VENDOR_ID: 0x045e,
    isZuneProductId: (id: number) => id === 0x063e || id === 0x0710,
    detectDevice: (id: number, capacity?: number | bigint | null) => ({
      productId: id,
      name:
        id === 0x063e
          ? "Zune HD 32"
          : capacity != null && Number(capacity) < 20_000_000_000
            ? "Zune 8"
            : "Zune 30",
      shortName: "zune",
      family: id === 0x063e ? "hd" : "classic",
      generation: id === 0x063e ? "HD" : "2",
    }),
  };
});

vi.mock("../zune", () => ({
  findUsbDevice: async () => h.state.usbDevice,
  WebUsbMtpTransport: class {
    async open() {
      return undefined;
    }
  },
}));

const { ZuneDetector } = await import("./ZuneDetector");

const zuneUsb = {
  vendorId: 0x045e,
  productId: 0x063e,
  serialNumber: "S1",
  manufacturerName: "Microsoft",
  productName: "Zune HD",
};

describe("ZuneDetector", () => {
  beforeEach(() => {
    h.state.disconnected = false;
    h.state.model = undefined;
    h.state.storage = {
      maxCapacity: 32_000_000_000n,
      freeSpaceInBytes: 8_000_000_000n,
    };
    h.state.usbDevice = {};
    h.state.objectSizes = {};
    h.state.objectFilenames = {};
    h.state.atomIdsAreHandles = true;
    h.state.albumArtwork = {};
    h.state.objectStrings = {};
    h.state.objectProps = {};
    h.state.objectProps = {};
    h.state.library = {
      tracks: [],
      albums: {},
      artists: {},
      genres: {},
      videos: [],
      pictures: [],
      playlists: [],
      podcastShows: [],
      podcastEpisodes: [],
    };
  });

  it("ignores a device from another vendor", async () => {
    await expect(
      new ZuneDetector().detect(undefined, { ...zuneUsb, vendorId: 0x05ac })
    ).resolves.toBeUndefined();
  });

  it("ignores an unknown product id", async () => {
    await expect(
      new ZuneDetector().detect(undefined, { ...zuneUsb, productId: 0x9999 })
    ).resolves.toBeUndefined();
  });

  it("reports a Zune that is no longer granted instead of a generic error", async () => {
    h.state.usbDevice = undefined;

    // Returning `undefined` made the scanner fall through to the next
    // detector and end with `"device" is not a supported device`, which says
    // nothing about the real problem: the device is gone or not permitted.
    await expect(
      new ZuneDetector().detect(undefined, zuneUsb)
    ).rejects.toThrow(/not available over USB/);
  });

  it("names a Zune 8 by capacity, not by its family product id", async () => {    // 0x0710 is shared by the whole classic family, so the product id alone
    // cannot tell a Zune 8 from a Zune 30. The capacity from GetStorageInfo
    // is what distinguishes them.
    h.state.storage = {
      maxCapacity: 8_000_000_000n,
      freeSpaceInBytes: 2_000_000_000n,
    };
    h.state.model = {
      productId: 0x0710,
      name: "Zune 8",
      shortName: "zune-8",
      family: "classic",
      generation: "2",
      capacityGb: 8,
    };

    const device = await new ZuneDetector().detect(undefined, {
      ...zuneUsb,
      productId: 0x0710,
      productName: "Zune",
    });

    expect(device?.model).toBe("Zune 8");
    expect(device?.name).toBe("Zune 8");
    expect(device?.productId).toBe(0x0710);
  });

  it("maps the ZMDB library and storage onto a sync device", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Song",
          artist: "Artist",
          album: "Album",
          albumArtist: "Artist",
          genre: "Genre",
          trackNumber: 2,
          discNumber: 1,
          duration: 180_000,
          size: 5_242_880,
          playcount: 0,
          codecId: 0,
          rating: 0,
          filename: "Song.mp3",
          albumRef: 1,
          genreRef: 1,
        },
      ],
      playlists: [{ atomId: 3, name: "Mix", trackAtomIds: [7] }],
    };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.type).toBe("zune");
    expect(device?.model).toBe("Zune HD 32");
    expect(device?.media.tracks).toMatchObject([
      {
        id: 7,
        title: "Song",
        artist: "Artist",
        album: "Album",
        albumArtist: "Artist",
        genre: "Genre",
        year: undefined,
        trackNumber: 2,
        discNumber: 1,
        durationMs: 180_000,
        fileSize: 5_242_880,
        playCount: undefined,
        rating: undefined,
        codecId: undefined,
        bitrate: 233,
        path: "Song.mp3",
      },
    ]);

    // Artwork is deferred, so the track carries a loader rather than bytes.
    expect(device?.media.tracks[0].artwork).toBeUndefined();
    expect(typeof device?.media.tracks[0].artworkLoader).toBe("function");
    expect(device?.media.playlists).toEqual([
      { id: 3n, name: "Mix", trackIds: [7] },
    ]);
    expect(device?.storage).toEqual({
      capacityBytes: 32_000_000_000,
      usedBytes: 24_000_000_000,
    });
    expect(device?.capabilities.database).toBe(true);
    expect(device?.capabilities.playlists).toBe(false);
    expect(h.state.disconnected).toBe(true);
  });

  /**
   * The ZMDB `size` field is not reliable on every device: a Zune 120 records
   * a handful of bytes for tracks whose audio is megabytes, so the device
   * contents list showed "9 B" for a 4 MB song. The MTP object itself knows
   * its size (`GetObjectInfo.compressedSize`), and a ZMDB atom id is a valid
   * MTP handle, so the object is the authoritative source.
   */
  it("reports the object's size from MTP when the ZMDB size is implausible", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 240_000,
          size: 9,
          filename: "Higher.mp3",
        },
      ],
    };
    h.state.objectSizes = { 7: 5_242_880 };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].fileSize).toBe(5_242_880);
  });

  /**
   * A flat byte floor is not enough: a Zune 120 recorded 64 KB for a track
   * whose audio is 4.9 MB, which clears any small threshold while still being
   * wrong. Size is checked against duration instead — even a very low bitrate
   * track is at least as many bytes as it is milliseconds long (8 kbps).
   */
  it("reports the object's size when the ZMDB size is too small for its duration", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 8,
          title: "My Own Prison",
          artist: "Creed",
          album: "My Own Prison",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 300_000,
          size: 65_536,
          filename: "My Own Prison.mp3",
        },
      ],
    };
    h.state.objectSizes = { 8: 5_138_022 };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].fileSize).toBe(5_138_022);
  });

  /**
   * A ZMDB atom id is not always a valid MTP handle — the reference probes
   * this and falls back to matching by filename (`zune-manager.js:824-858`).
   * When the atom-id lookup fails, the size must still be recovered from the
   * object list rather than left at the wrong database value.
   */
  it("falls back to matching by filename when atom ids are not handles", async () => {
    h.state.atomIdsAreHandles = false;
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 8,
          title: "My Own Prison",
          artist: "Creed",
          album: "My Own Prison",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 300_000,
          size: 65_536,
          filename: "My Own Prison.mp3",
        },
      ],
    };
    h.state.objectSizes = { 0x4000: 5_138_022 };
    h.state.objectFilenames = { 0x4000: "My Own Prison.mp3" };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].fileSize).toBe(5_138_022);
  });

  /**
   * A Zune 120 answered 12297 (`0x3009`, the MP3 object format) at the track
   * number offset for every track, so the column showed 12297 four times. An
   * implausible value falls back to the leading number in the filename.
   */
  it("derives the track number from the filename when the device value is implausible", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 12297,
          discNumber: 1,
          duration: 240_000,
          size: 5_242_880,
          filename: "01 Higher.mp3",
        },
      ],
    };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].trackNumber).toBe(1);
  });

  /**
   * A track whose ZMDB duration is 0 defeats a duration-based size check: the
   * comparison is skipped, the implausible size is accepted, and the list keeps
   * showing 64.0 KB. Duration and size both come from the object when the
   * database has nothing usable.
   */
  it("recovers duration and size from the object when the ZMDB has neither", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 8,
          title: "My Own Prison",
          artist: "Creed",
          album: "My Own Prison",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 0,
          size: 65_536,
          filename: "My Own Prison.mp3",
        },
      ],
    };
    h.state.objectSizes = { 8: 5_138_022 };
    h.state.objectProps = { [`8:${0xdc89}`]: 300_000 };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].fileSize).toBe(5_138_022);
    expect(device?.media.tracks[0].durationMs).toBe(300_000);
  });

  /**
   * The ZMDB carries no bitrate field, so the column rendered "undefined".
   * It is derivable from the bytes and the duration: bits per millisecond is
   * kilobits per second.
   */
  it("derives bitrate from size and duration", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 240_000,
          size: 5_242_880,
          filename: "Higher.mp3",
        },
      ],
    };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].bitrate).toBe(175);
  });

  /**
   * A nonzero but implausible ZMDB duration is as bad as a zero one: a Zune
   * 120 reported 324 ms for a 4-minute track, which rendered as 0:00 and made
   * the derived bitrate absurd (129564 kbps). Duration must be re-read from
   * the object whenever it is too short to be real, not only when it is zero.
   */
  it("recovers duration when the ZMDB value is nonzero but implausible", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 324,
          size: 5_242_880,
          filename: "Higher.mp3",
        },
      ],
    };
    h.state.objectProps = { [`7:${0xdc89}`]: 240_000 };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].durationMs).toBe(240_000);
    expect(device?.media.tracks[0].bitrate).toBe(175);
  });

  /**
   * The device's `Duration` property is not always milliseconds. A Zune 120
   * answered 240 for a 4-minute track, which a milliseconds-only reading
   * rejects as implausible, leaving the track at 0:00. A value too small to be
   * milliseconds but sane as seconds is read as seconds.
   */
  it("reads a Duration reported in seconds as seconds", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 324,
          size: 5_242_880,
          filename: "Higher.mp3",
        },
      ],
    };
    h.state.objectProps = { [`7:${0xdc89}`]: 240 };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].durationMs).toBe(240_000);
    expect(device?.media.tracks[0].bitrate).toBe(175);
  });

  /**
   * Cover art lives on the album object. Reading it during the scan is what
   * made a large library slow to appear, so the scan attaches a loader and the
   * bytes are read only when a view renders the tile.
   */
  it("defers album artwork to a loader on its tracks", async () => {
    h.state.library = {
      ...h.state.library,
      albums: {
        5: {
          atomId: 5,
          artistRef: 0,
          title: "Human Clay",
          artistName: "Creed",
          releaseYear: 1999,
          filename: "Creed--Human Clay.alb",
        },
      },
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 240_000,
          size: 5_242_880,
          filename: "Higher.mp3",
        },
      ],
    };
    h.state.albumArtwork = { 5: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);
    const track = device?.media.tracks[0];

    // Nothing was read during the scan.
    expect(track?.artwork).toBeUndefined();
    expect(typeof track?.artworkLoader).toBe("function");

    const artwork = await track?.artworkLoader?.();
    expect(artwork).toBeInstanceOf(Blob);
    expect(artwork?.size).toBe(4);
  });

  /**
   * An album with no artwork must not trigger a per-handle `GetObjectInfo`
   * sweep over album objects.
   *
   * That fallback matched albums by filename, but a Zune 120 does not answer
   * `GetObjectInfo` for album handles: each call burned the full 15 s timeout
   * and wedged the session, so the rest failed with GenericFailure. Measured on
   * hardware with 14 tracks and 12 albums: 70453 ms per scan, 68 s of it four
   * timed-out album reads. Without the sweep the same scan takes 2239 ms.
   */
  it("does not probe album handles when an album has no artwork", async () => {
    h.state.library = {
      ...h.state.library,
      albums: {
        5: {
          atomId: 5,
          artistRef: 0,
          title: "Human Clay",
          artistName: "Creed",
          releaseYear: 1999,
          filename: "Creed--Human Clay.alb",
        },
      },
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 240_000,
          size: 5_242_880,
          filename: "Higher.mp3",
        },
      ],
    };
    // No artwork for album 5, so the album stays unresolved.
    h.state.albumArtwork = {};
    h.state.objectInfoHandles = [];

    const device = await new ZuneDetector().detect(undefined, zuneUsb);
    const track = device?.media.tracks[0];

    expect(track?.artwork).toBeUndefined();
    expect(await track?.artworkLoader?.()).toBeUndefined();
    expect(h.state.objectInfoHandles).not.toContain(5);
  });

  /**
   * A classic ZMDB track record leaves its filename field empty, so the track
   * number cannot be derived from the database value. The MTP object's own
   * filename is the real one.
   */
  it("derives the track number from the object filename when the ZMDB has none", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 12297,
          discNumber: 1,
          duration: 240_000,
          size: 5_242_880,
          filename: "",
        },
      ],
    };
    h.state.objectSizes = { 7: 5_242_880 };
    h.state.objectFilenames = { 7: "01 Higher.mp3" };

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    expect(device?.media.tracks[0].trackNumber).toBe(1);
  });

  /**
   * A classic album record carries no FILETIME, so the ZMDB has no year. The
   * object's `OriginalDate` does, and that is what the sync writer sets.
   */
  it("does not read OriginalDate, which wedges the session", async () => {
    h.state.library = {
      ...h.state.library,
      tracks: [
        {
          atomId: 7,
          title: "Higher",
          artist: "Creed",
          album: "Human Clay",
          genre: "Rock",
          trackNumber: 1,
          discNumber: 1,
          duration: 240_000,
          size: 5_242_880,
          filename: "01 Higher.mp3",
        },
      ],
    };
    h.state.objectStrings = { [`7:${0xdc99}`]: "1999-08-31T00:00:00.0" };
    h.state.objectStringReads = 0;

    const device = await new ZuneDetector().detect(undefined, zuneUsb);

    // The device does not answer this property and the transport cannot cancel
    // the read, so issuing it wedges the session until it is unplugged. The
    // year is left unresolved rather than costing the whole scan.
    expect(h.state.objectStringReads).toBe(0);
    expect(device?.media.tracks[0].year).toBeUndefined();
  });
});
