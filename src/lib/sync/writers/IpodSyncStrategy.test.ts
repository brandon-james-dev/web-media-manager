import { describe, expect, it, vi } from "vitest";

/**
 * A sync reports progress per song so the button can show how far it has got.
 * The run must report once per queued song — including songs already on the
 * device and songs whose audio file is missing — otherwise the bar stalls
 * short of the total.
 *
 * Each written song is then re-checked on the device: the track record has to
 * be in the database and its audio file has to exist, which is what turns a
 * write into a confirmed `verified` outcome.
 */

const { fakeItdb, fakeStore, fakeFs } = vi.hoisted(() => {
  const fakeItdb = {
    tracks: [] as {
      trackId: number;
      title: string;
      album: string;
      artist: string;
      path?: string;
      mhiiLink?: number;
    }[],
    playlists: [] as {
      playlistId: bigint;
      name?: string;
      isMaster?: boolean;
      mhsdIndex?: number;
      items: { trackId: number }[];
      dataObjects: { type: number; stringValue?: string }[];
    }[],
    setArtwork: vi.fn(async () => ({})),
    addPlaylist: vi.fn((name: string) => {
      const playlist = {
        playlistId: BigInt(fakeItdb.playlists.length + 100),
        name,
        isMaster: false,
        items: [],
        dataObjects: [],
      };
      fakeItdb.playlists.push(playlist);
      return playlist;
    }),
    removePlaylist: vi.fn((id: bigint) => {
      fakeItdb.playlists = fakeItdb.playlists.filter(
        (p) => p.playlistId !== id
      );
    }),
    removeTrackFromPlaylist: vi.fn(),
    // Rollback removes the records a failed run wrote.
    removeTrack: vi.fn((id: number) => {
      fakeItdb.tracks = fakeItdb.tracks.filter((t) => t.trackId !== id);
    }),
    addTrackToPlaylist: vi.fn(),
    // The device's cover-art formats. Empty means it cannot store artwork, so
    // the strategy must not pass any.
    artworkFormats: [] as { formatId: number }[],
    // Mirrors the real addTrack: the track joins the database and gets a path
    // on the device, which is what the post-write verification looks for. The
    // location is colon-separated and rooted, exactly as itunesdb-ts stores it
    // — a slash-separated fake here hid the fact that the strategy was handing
    // that location straight to a `/`-based filesystem port.
    addTrack: vi.fn(
      async (meta: { title: string; album?: string; artist?: string }) => {
        const track = {
          trackId: fakeItdb.tracks.length + 1,
          title: meta.title,
          album: meta.album ?? "",
          artist: meta.artist ?? "",
          path: `:iPod_Control:Music:F00:${meta.title}.mp3`,
        };
        fakeItdb.tracks.push(track);
        return track;
      }
    ),
    save: vi.fn(async () => undefined),
    [Symbol.dispose]: () => undefined,
  };

  const fakeStore = {
    getFileSystem: () => ({
      getFileHandle: async (id: string) =>
        id === "missing"
          ? null
          : { getFile: async () => new File([], "a.mp3") },
    }),
  };

  // `exists` backs the post-write verification: the strategy re-checks that
  // each written track's audio file is on the device. Tests flip it to false
  // to simulate a write that did not reach the device.
  const fakeFs = { exists: vi.fn(async () => true) };

  return { fakeItdb, fakeStore, fakeFs };
});

vi.mock("itunesdb-ts", () => ({
  Itdb: { open: async () => fakeItdb },
  detectDevice: () => undefined,
  createBrowserFs: () => fakeFs,
}));

vi.mock("@/lib/persistence/initMetadataStore", () => ({
  getMetadataStore: () => fakeStore,
}));

// The strategy resolves a song's audio through its source's strategy, so the
// source port has to be registered for a sync to read anything at all.
vi.mock("@/core/ports", () => ({
  getSourcesStore: () => ({
    getSources: async () => [{ id: "local", kind: "local" }],
  }),
}));

vi.mock("@/lib/sources", () => ({
  allMusicSourceStrategies: [
    {
      kind: "local",
      // A song whose audio cannot be read resolves to null.
      resolveSongBytes: async (song: { id: string }) =>
        song.id === "missing" ? null : new ArrayBuffer(1),
    },
  ],
}));

const { IpodSyncStrategy } = await import("./IpodSyncStrategy");

const device = {
  id: "dev-1",
  name: "iPod",
  type: "iPod",
  rootHandle: {},
} as never;

const song = (id: string, title: string) =>
  ({
    id,
    sourceId: "local",
    relativePath: `${id}.mp3`,
    filename: `${id}.mp3`,
    filesize: 1,
    title,
    album: "Album",
    artist: "Artist",
  }) as never;

describe("IpodSyncStrategy progress", () => {
  it("reports once per queued song, ending at the total", async () => {
    fakeItdb.tracks = [];
    const seen: [number, number][] = [];

    await new IpodSyncStrategy().sync(
      device,
      [song("a", "One"), song("b", "Two"), song("c", "Three")],
      [],
      (completed, total) => seen.push([completed, total])
    );

    expect(seen).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it("counts a song already on the device as done", async () => {
    fakeItdb.tracks = [
      { trackId: 1, title: "One", album: "Album", artist: "Artist" },
    ];
    const seen: [number, number][] = [];

    await new IpodSyncStrategy().sync(
      device,
      [song("a", "One"), song("b", "Two")],
      [],
      (completed, total) => seen.push([completed, total])
    );

    expect(seen).toEqual([
      [1, 2],
      [2, 2],
    ]);
    // The already-present track is not written again.
    expect(fakeItdb.addTrack).toHaveBeenCalledTimes(1);
  });

  it("counts a song with no audio file as done so the bar still completes", async () => {
    fakeItdb.tracks = [];
    const seen: [number, number][] = [];

    await new IpodSyncStrategy().sync(
      device,
      [song("missing", "Gone"), song("b", "Two")],
      [],
      (completed, total) => seen.push([completed, total])
    );

    expect(seen).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });

  it("works without a progress handler", async () => {
    fakeItdb.tracks = [];

    await expect(
      new IpodSyncStrategy().sync(device, [song("a", "One")], [])
    ).resolves.toBeDefined();
  });
});

describe("IpodSyncStrategy artwork", () => {
  it("writes the song's cover art with the track", async () => {
    fakeItdb.tracks = [];
    fakeItdb.artworkFormats = [{ formatId: 1 }];
    fakeItdb.addTrack.mockClear();
    const art = new Uint8Array([1, 2, 3]);

    await new IpodSyncStrategy(undefined, async () => art).sync(
      device,
      [song("a", "One")],
      []
    );

    expect(fakeItdb.addTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      art
    );
    fakeItdb.artworkFormats = [];
  });

  it("writes no artwork when the song has none", async () => {
    fakeItdb.tracks = [];
    fakeItdb.artworkFormats = [{ formatId: 1 }];
    fakeItdb.addTrack.mockClear();

    await new IpodSyncStrategy(undefined, async () => null).sync(
      device,
      [song("a", "One")],
      []
    );

    expect(fakeItdb.addTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined
    );
    fakeItdb.artworkFormats = [];
  });

  it("writes no artwork when the device cannot store it", async () => {
    fakeItdb.tracks = [];
    fakeItdb.artworkFormats = [];
    fakeItdb.addTrack.mockClear();
    const resolveArtwork = vi.fn(async () => new Uint8Array([1, 2, 3]));

    await new IpodSyncStrategy(undefined, resolveArtwork).sync(
      device,
      [song("a", "One")],
      []
    );

    expect(resolveArtwork).not.toHaveBeenCalled();
    expect(fakeItdb.addTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined
    );
  });

  it("still writes the track when reading the cover fails", async () => {
    fakeItdb.tracks = [];
    fakeItdb.artworkFormats = [{ formatId: 1 }];
    fakeItdb.addTrack.mockClear();

    await new IpodSyncStrategy(undefined, async () => {
      throw new Error("no artwork");
    }).sync(device, [song("a", "One")], []);

    expect(fakeItdb.addTrack).toHaveBeenCalledTimes(1);
    expect(fakeItdb.addTrack).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      undefined
    );
    fakeItdb.artworkFormats = [];
  });
});

describe("IpodSyncStrategy verification", () => {
  it("reports a written song as verified once it is on the device", async () => {
    fakeItdb.tracks = [];
    const outcomes: { songId: string; status: string }[] = [];

    const summary = await new IpodSyncStrategy().sync(
      device,
      [song("a", "One")],
      [],
      (_completed, _total, outcome) => {
        if (outcome) outcomes.push(outcome);
      }
    );

    expect(outcomes).toEqual([{ songId: "a", status: "verified" }]);
    expect(summary.added).toEqual(["a"]);
    expect(summary.unverified).toEqual([]);
  });

  it("reports a song as unverified when its file is missing afterwards", async () => {
    fakeItdb.tracks = [];
    // The database accepts the track but the device has no file for it.
    fakeFs.exists.mockResolvedValueOnce(false);
    const outcomes: { songId: string; status: string }[] = [];

    const summary = await new IpodSyncStrategy().sync(
      device,
      [song("a", "One")],
      [],
      (_completed, _total, outcome) => {
        if (outcome) outcomes.push(outcome);
      }
    );

    expect(outcomes).toEqual([{ songId: "a", status: "unverified" }]);
    expect(summary.unverified).toEqual(["a"]);
    expect(summary.added).toEqual([]);
  });

  it("checks the audio file at its slash-separated path", async () => {
    fakeItdb.tracks = [];
    fakeFs.exists.mockClear();

    await new IpodSyncStrategy().sync(device, [song("a", "One")], []);

    // The database stores `:iPod_Control:Music:F00:One.mp3`; the filesystem
    // port takes `iPod_Control/Music/F00/One.mp3`. Passing the location
    // through unchanged made every write look unverified.
    expect(fakeFs.exists).toHaveBeenCalledWith(
      "iPod_Control/Music/F00/One.mp3"
    );
  });

  it("leaves a song with no audio out of both added and unverified", async () => {
    fakeItdb.tracks = [];

    const summary = await new IpodSyncStrategy().sync(
      device,
      [song("missing", "Gone")],
      []
    );

    expect(summary.skipped).toEqual(["missing"]);
    expect(summary.added).toEqual([]);
    expect(summary.unverified).toEqual([]);
  });
});

describe("IpodSyncStrategy cover art backfill", () => {
  it("adds cover art to a track already on the device that has none", async () => {
    fakeItdb.tracks = [
      {
        trackId: 7,
        title: "One",
        album: "Album",
        artist: "Artist",
        mhiiLink: 0,
      },
    ];
    fakeItdb.artworkFormats = [{ formatId: 1 }];
    fakeItdb.setArtwork.mockClear();
    const art = new Uint8Array([9]);

    await new IpodSyncStrategy(undefined, async () => art).sync(
      device,
      [song("a", "One")],
      []
    );

    expect(fakeItdb.setArtwork).toHaveBeenCalledWith(7, art);
    fakeItdb.artworkFormats = [];
  });

  it("leaves a track that already has cover art alone", async () => {
    fakeItdb.tracks = [
      {
        trackId: 7,
        title: "One",
        album: "Album",
        artist: "Artist",
        mhiiLink: 3,
      },
    ];
    fakeItdb.artworkFormats = [{ formatId: 1 }];
    fakeItdb.setArtwork.mockClear();

    await new IpodSyncStrategy(undefined, async () => new Uint8Array([9])).sync(
      device,
      [song("a", "One")],
      []
    );

    expect(fakeItdb.setArtwork).not.toHaveBeenCalled();
    fakeItdb.artworkFormats = [];
  });
});

describe("IpodSyncStrategy playlists", () => {
  const playlist = (name: unknown) =>
    ({
      id: String(name),
      name,
      songs: [],
      createdAt: 0,
      updatedAt: 0,
    }) as never;

  it("writes the playlist name as a title data object", async () => {
    fakeItdb.tracks = [];
    fakeItdb.playlists = [];

    await new IpodSyncStrategy().sync(device, [], [playlist("Road Trip")]);

    expect(fakeItdb.playlists).toHaveLength(1);
    expect(fakeItdb.playlists[0].dataObjects).toEqual([
      { type: 1, stringValue: "Road Trip" },
    ]);
  });

  it("reuses a named playlist instead of adding another", async () => {
    fakeItdb.tracks = [];
    fakeItdb.playlists = [];
    const strategy = new IpodSyncStrategy();

    await strategy.sync(device, [], [playlist("Road Trip")]);
    await strategy.sync(device, [], [playlist("Road Trip")]);

    expect(fakeItdb.playlists).toHaveLength(1);
  });

  it("removes nameless playlists left by earlier syncs", async () => {
    fakeItdb.tracks = [];
    fakeItdb.playlists = [
      {
        playlistId: 1n,
        name: "iPod",
        isMaster: true,
        items: [],
        dataObjects: [],
      },
      { playlistId: 2n, isMaster: false, items: [], dataObjects: [] },
    ];

    await new IpodSyncStrategy().sync(device, [], []);

    expect(fakeItdb.playlists.map((p) => p.name)).toEqual(["iPod"]);
  });

  it("skips a playlist with no name", async () => {
    fakeItdb.tracks = [];
    fakeItdb.playlists = [];
    fakeItdb.addPlaylist.mockClear();

    await new IpodSyncStrategy().sync(
      device,
      [],
      [playlist(undefined), playlist("  ")]
    );

    expect(fakeItdb.addPlaylist).not.toHaveBeenCalled();
  });
});

describe("IpodSyncStrategy database writes", () => {
  it("saves after every song write, before reporting it", async () => {
    fakeItdb.tracks = [];
    fakeItdb.save.mockClear();

    const order: string[] = [];
    fakeItdb.save.mockImplementation(async () => {
      order.push("save");
    });

    try {
      await new IpodSyncStrategy().sync(
        device,
        [song("a", "One"), song("b", "Two")],
        [],
        (completed) => order.push(`progress:${completed}`)
      );
    } finally {
      fakeItdb.save.mockImplementation(async () => undefined);
    }

    // Each song is committed before its progress is reported, so a run that
    // stops early cannot leave audio on the device with no track record.
    expect(order).toEqual(["save", "progress:1", "save", "progress:2"]);
    expect(fakeItdb.save).toHaveBeenCalledTimes(2);
  });

  it("leaves the databases untouched when nothing changed", async () => {
    fakeItdb.tracks = [
      { trackId: 1, title: "One", album: "Album", artist: "Artist" },
    ];
    fakeItdb.save.mockClear();

    await new IpodSyncStrategy().sync(device, [song("a", "One")], []);

    expect(fakeItdb.save).not.toHaveBeenCalled();
  });
});

describe("IpodSyncStrategy cancellation", () => {
  it("rolls back the songs written before a cancel", async () => {
    fakeItdb.tracks = [];
    fakeItdb.save.mockClear();

    class Canceled extends Error {}

    await expect(
      new IpodSyncStrategy().sync(
        device,
        [song("a", "One"), song("b", "Two")],
        [],
        (completed) => {
          if (completed === 1) throw new Canceled();
        }
      )
    ).rejects.toThrow(Canceled);

    // The first song was committed before its progress fired, then taken back
    // when the run failed: the device is left as it was found.
    expect(fakeItdb.save).toHaveBeenCalledTimes(2);
    expect(fakeItdb.tracks).toHaveLength(0);
  });
});
