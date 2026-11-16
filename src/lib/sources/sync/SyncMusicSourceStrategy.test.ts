import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A device track is a real file under the device root, so playback has to read
 * it back the same way a local folder's song is read. Returning null here meant
 * a device track could be listed and synced but never played.
 */

const { getSources } = vi.hoisted(() => ({ getSources: vi.fn() }));

vi.mock("@/core/ports", () => ({
  getSourcesStore: () => ({ getSources }),
}));

const { SyncMusicSourceStrategy } = await import("./SyncMusicSourceStrategy");

const audio = new Uint8Array([1, 2, 3, 4]);

/** A directory handle tree: `iPod_Control/Music/F00/Song.mp3`. */
function fakeRoot() {
  const f00 = {
    getFileHandle: async (name: string) => {
      if (name !== "Song.mp3") throw new Error("not found");
      return { getFile: async () => new File([audio], "Song.mp3") };
    },
  };

  const music = {
    getDirectoryHandle: async (name: string) => {
      if (name !== "F00") throw new Error("not found");
      return f00;
    },
  };

  const iPodControl = {
    getDirectoryHandle: async (name: string) => {
      if (name !== "Music") throw new Error("not found");
      return music;
    },
  };

  return {
    getDirectoryHandle: async (name: string) => {
      if (name !== "iPod_Control") throw new Error("not found");
      return iPodControl;
    },
  };
}

const song = (relativePath: string) =>
  ({
    id: "dev-1:42",
    sourceId: "dev-1",
    relativePath,
    filename: "Song.mp3",
    filesize: 4,
    title: "Song",
  }) as never;

describe("SyncMusicSourceStrategy playback", () => {
  beforeEach(() => {
    getSources.mockReset();
  });

  it("reads a track's audio from the device root", async () => {
    getSources.mockResolvedValue([
      { id: "dev-1", kind: "sync", rootHandle: fakeRoot() },
    ]);

    const bytes = await new SyncMusicSourceStrategy().resolveSongBytes(
      song("iPod_Control/Music/F00/Song.mp3")
    );

    expect(bytes).not.toBeNull();
    expect(new Uint8Array(bytes!)).toEqual(audio);
  });

  it("returns null when the source is not connected", async () => {
    getSources.mockResolvedValue([{ id: "dev-1", kind: "sync" }]);

    await expect(
      new SyncMusicSourceStrategy().resolveSongBytes(
        song("iPod_Control/Music/F00/Song.mp3")
      )
    ).resolves.toBeNull();
  });

  it("returns null when the track has no path", async () => {
    getSources.mockResolvedValue([
      { id: "dev-1", kind: "sync", rootHandle: fakeRoot() },
    ]);

    await expect(
      new SyncMusicSourceStrategy().resolveSongBytes(song(""))
    ).resolves.toBeNull();
  });

  it("returns null when the file is missing on the device", async () => {
    getSources.mockResolvedValue([
      { id: "dev-1", kind: "sync", rootHandle: fakeRoot() },
    ]);

    await expect(
      new SyncMusicSourceStrategy().resolveSongBytes(
        song("iPod_Control/Music/F00/Gone.mp3")
      )
    ).resolves.toBeNull();
  });
});
