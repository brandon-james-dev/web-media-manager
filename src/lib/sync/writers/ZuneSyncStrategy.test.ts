import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A Zune has no filesystem: tracks are uploaded as MTP objects and the device
 * database is what lists them. A write the device did not record must not be
 * reported as synced, and a song already on the device must not be uploaded
 * twice.
 */

const h = vi.hoisted(() => ({
  state: {
    reads: [] as unknown[],
    uploads: [] as unknown[],
    deleted: [] as number[],
    committed: false,
    rolledBack: false,
    synced: 0,
    commits: 0,
    order: [] as string[],
  },
}));

vi.mock("zunesync-ts", () => {
  class FakeZune {
    static async open() {
      return new FakeZune();
    }

    async readDatabase() {
      return h.state.reads.shift() ?? emptyLibrary();
    }

    createSession() {
      return {
        begin: async () => undefined,
        track: () => undefined,
        commit: async () => {
          h.state.committed = true;
          h.state.commits += 1;
          h.state.order.push("commit");
        },
        rollback: async () => {
          h.state.rolledBack = true;
        },
      };
    }

    async uploadTrack(track: unknown) {
      h.state.uploads.push(track);
      return h.state.uploads.length;
    }

    async createArtist() {
      return 1;
    }

    async createAlbum() {
      return 2;
    }

    async deleteObject(id: number) {
      h.state.deleted.push(id);
    }

    async syncDeviceDB() {
      h.state.synced += 1;
    }

    async disconnect() {
      return undefined;
    }
  }

  return { Zune: FakeZune };
});

vi.mock("../zune", () => ({
  findUsbDevice: async () => ({}),
  WebUsbMtpTransport: class {
    async open() {
      return undefined;
    }
  },
}));

vi.mock("../helpers", () => ({
  trackIdentity: (title?: string, album?: string, artist?: string) =>
    [title ?? "", album ?? "", artist ?? ""].join("\u0000"),
}));

vi.mock("@/lib/offline", () => ({
  resolveSongBytesWithCache: async () => null,
  resolveThroughSource: async () => null,
}));

const { ZuneSyncStrategy } = await import("./ZuneSyncStrategy");

function emptyLibrary() {
  return {
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
}

function libraryWith(...titles: string[]) {
  return {
    ...emptyLibrary(),
    tracks: titles.map((title, index) => ({
      atomId: index + 1,
      title,
      artist: "Artist",
      album: "Album",
      albumArtist: "Artist",
      genre: "Genre",
      trackNumber: 1,
      discNumber: 1,
      duration: 1000,
      size: 4,
      playcount: 0,
      codecId: 0,
      rating: 0,
      filename: `${title}.mp3`,
      albumRef: 0,
      genreRef: 0,
    })),
  };
}

const song = (id: string, title: string) =>
  ({
    id,
    sourceId: "local",
    relativePath: `${title}.mp3`,
    filename: `${title}.mp3`,
    filesize: 4,
    title,
    artist: "Artist",
    album: "Album",
    duration: 1,
  }) as never;

const device = {
  id: "zune-1",
  name: "Zune HD",
  type: "zune",
  usb: { vendorId: 0x045e, productId: 0x063e, serialNumber: "S1" },
  media: { tracks: [], playlists: [], artworks: [] },
  capabilities: {
    database: true,
    artwork: false,
    playlists: false,
    playbackStats: false,
  },
  createdAt: 0,
  connected: true,
} as never;

const bytes = async () => new ArrayBuffer(4);

describe("ZuneSyncStrategy", () => {
  beforeEach(() => {
    h.state.reads = [];
    h.state.uploads = [];
    h.state.deleted = [];
    h.state.committed = false;
    h.state.rolledBack = false;
    h.state.synced = 0;
    h.state.commits = 0;
    h.state.order = [];
  });

  it("commits the device database after every track, before reporting it", async () => {
    h.state.reads = [emptyLibrary(), libraryWith("One", "Two")];

    await new ZuneSyncStrategy(bytes).sync(
      device,
      [song("s1", "One"), song("s2", "Two")],
      [],
      (completed) => h.state.order.push(`progress:${completed}`)
    );

    // Each track is committed before its progress is reported, so a run that
    // stops early leaves objects the device database lists.
    expect(h.state.order.slice(0, 4)).toEqual([
      "commit",
      "progress:1",
      "commit",
      "progress:2",
    ]);
    expect(h.state.commits).toBe(2);
  });

  it("uploads a missing song and verifies it on the re-read", async () => {
    h.state.reads = [emptyLibrary(), libraryWith("New")];

    const summary = await new ZuneSyncStrategy(bytes).sync(
      device,
      [song("s1", "New")],
      []
    );

    expect(h.state.uploads).toHaveLength(1);
    expect(h.state.committed).toBe(true);
    expect(summary.added).toEqual(["s1"]);
    expect(summary.unverified).toEqual([]);
  });

  it("does not upload a song already on the device", async () => {
    h.state.reads = [libraryWith("Old")];

    const summary = await new ZuneSyncStrategy(bytes).sync(
      device,
      [song("s1", "Old")],
      []
    );

    expect(h.state.uploads).toHaveLength(0);
    expect(summary.alreadyPresent).toEqual(["s1"]);
  });

  it("skips a song whose audio is unavailable", async () => {
    h.state.reads = [emptyLibrary()];

    const summary = await new ZuneSyncStrategy().sync(
      device,
      [song("s1", "Gone")],
      []
    );

    expect(h.state.uploads).toHaveLength(0);
    expect(summary.skipped).toEqual(["s1"]);
  });

  it("reports a write the device did not record as unverified", async () => {
    h.state.reads = [emptyLibrary(), emptyLibrary()];

    // A short budget: this device never records the write, so the default
    // 20 s wait would only slow the suite down.
    const summary = await new ZuneSyncStrategy(bytes, 50).sync(
      device,
      [song("s1", "Lost")],
      []
    );

    expect(summary.added).toEqual([]);
    expect(summary.unverified).toEqual(["s1"]);
  });

  it("deletes each requested track and flushes the database", async () => {
    await new ZuneSyncStrategy(bytes).removeTracks(device, [4, 9]);

    expect(h.state.deleted).toEqual([4, 9]);
    expect(h.state.synced).toBe(1);
  });
});
