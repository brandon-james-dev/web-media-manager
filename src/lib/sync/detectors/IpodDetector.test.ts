import { describe, expect, it, vi } from "vitest";

/**
 * The detector maps the device library out of the open `Itdb` handle. That
 * handle's `dispose()` empties the database's track, playlist and artwork
 * arrays, so mapping after disposal silently yields an empty library — the
 * device then lists no songs even though its iTunesDB has them.
 *
 * This pins the ordering: the mapped library must survive disposal.
 */

const { fakeItdb } = vi.hoisted(() => {
  const TRACK = {
    trackId: 7,
    title: "Amarillo by Morning",
    album: "Strait Country",
    artist: "George Strait",
    length: 173000,
    mhiiLink: 0,
  };

  const PLAYLIST = {
    playlistId: 1n,
    name: "Library",
    isMaster: true,
    items: [{ trackId: 7 }],
  };

  const IMAGE = {
    imageId: 3,
    thumbnails: [
      { formatId: 1, imageWidth: 100, imageHeight: 100, filename: "a.ithmb" },
    ],
  };

  const db = { tracks: [TRACK], playlists: [PLAYLIST], albums: [] };
  const images = [IMAGE];

  // Mirrors itunesdb-ts: dispose() truncates the arrays in place.
  const fakeItdb = {
    db,
    images,
    resolvedDevice: { generation: "classic", capacityGB: 160 },
    artwork: { getImages: () => images },
    get tracks() {
      return db.tracks;
    },
    get playlists() {
      return db.playlists;
    },
    [Symbol.dispose]() {
      db.tracks.length = 0;
      db.playlists.length = 0;
      images.length = 0;
    },
  };

  return { fakeItdb };
});

vi.mock("itunesdb-ts", () => ({
  Itdb: { open: async () => fakeItdb },
  createBrowserFs: () => ({}),
  detectDevice: () => ({
    name: "iPod Classic",
    generation: "classic",
    capacityGB: 160,
    modelNumber: "A1238",
  }),
  checksumTypeForGeneration: () => "none",
  writeSysInfo: async () => {},
}));

const { IpodDetector } = await import("./IpodDetector");

function fakeRoot() {
  return {
    name: "IPOD",
    requestPermission: async () => "granted",
  } as unknown as FileSystemDirectoryHandle;
}

describe("IpodDetector", () => {
  it("maps the library before the handle is disposed", async () => {
    const device = await new IpodDetector().detect(fakeRoot(), {
      productId: 0x1209,
      serialNumber: "000A27001B2C3D4E",
    } as never);

    expect(device).toBeDefined();
    expect(device!.media.tracks).toHaveLength(1);
    expect(device!.media.tracks[0]).toMatchObject({
      id: 7,
      title: "Amarillo by Morning",
      artist: "George Strait",
    });
    expect(device!.media.playlists).toHaveLength(1);
    expect(device!.media.playlists[0].name).toBe("Library (Master)");
    expect(device!.media.artworks).toHaveLength(1);
  });

  it("returns undefined when no storage root was picked", async () => {
    await expect(
      new IpodDetector().detect(undefined, { productId: 0x1209 } as never)
    ).resolves.toBeUndefined();
  });

  it("still disposes the handle", async () => {
    // The fake is shared, so the truncated arrays prove the first call's
    // dispose ran — i.e. disposal still happens after mapping.
    expect(fakeItdb.db.tracks).toHaveLength(0);
    expect(fakeItdb.db.playlists).toHaveLength(0);
  });
});
