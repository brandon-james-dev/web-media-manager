import { describe, expect, it, vi } from "vitest";

/**
 * Reproduction: a worker sync that "completes" without writing anything.
 *
 * The store's getFileHandle returns undefined for any song that is not a local
 * file (that is the real FileSystemMetadataStore behaviour for a Subsonic
 * song). The run must not report success while leaving the device untouched.
 */

const { fakeItdb } = vi.hoisted(() => ({
  fakeItdb: {
    tracks: [] as unknown[],
    playlists: [] as unknown[],
    addTrack: vi.fn(async () => 1),
    save: vi.fn(async () => undefined),
    [Symbol.dispose]: () => undefined,
  },
}));

vi.mock("itunesdb-ts", () => ({
  Itdb: { open: async () => fakeItdb },
  detectDevice: () => undefined,
  // `exists` backs the post-write verification: the strategy re-checks
  // that each written track's audio file is on the device.
  createBrowserFs: () => ({ exists: async () => true }),
}));

vi.mock("@/lib/persistence/initMetadataStore", () => ({
  getMetadataStore: () => ({
    getFileSystem: () => ({ getFileHandle: async () => undefined }),
  }),
}));

// A Subsonic song resolves through its own source strategy, so the source port
// has to be registered for the run to read any audio at all.
vi.mock("@/core/ports", () => ({
  getSourcesStore: () => ({
    getSources: async () => [{ id: "subsonic-1", kind: "subsonic" }],
  }),
}));

vi.mock("@/lib/sources", () => ({
  allMusicSourceStrategies: [
    {
      kind: "subsonic",
      resolveSongBytes: async () => new ArrayBuffer(1),
    },
  ],
}));

const { runDeviceSync } = await import("@/workers/shared/runDeviceSync");

describe("worker sync of a non-local song", () => {
  it("writes the song to the device", async () => {
    const result = await runDeviceSync(
      {
        device: { id: "d", name: "iPod", type: "iPod", rootHandle: {} } as never,
        songs: [
          {
            id: "sub-1",
            sourceId: "subsonic-1",
            relativePath: "",
            filename: "",
            filesize: 1,
            title: "Just to See You Smile",
            album: "Everywhere",
            artist: "Tim McGraw",
          },
        ] as never,
        playlists: [],
      },
      () => false,
      () => undefined
    );

    console.log("result:", JSON.stringify(result));
    console.log("addTrack calls:", fakeItdb.addTrack.mock.calls.length);
    console.log("save calls:", fakeItdb.save.mock.calls.length);

    expect(fakeItdb.addTrack).toHaveBeenCalledTimes(1);
    expect(fakeItdb.save).toHaveBeenCalledTimes(1);
  });
});
