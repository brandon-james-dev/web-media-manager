import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Song, SyncDevice } from "@/models";

/**
 * A Zune does not rebuild its ZMDB as objects arrive: the new tracks only
 * appear in the database after `SyncDeviceDB` (0x9217) flushes them. The
 * strategy re-read the database straight after committing, so it saw the
 * pre-sync ZMDB and reported every uploaded song as "written but not found".
 *
 * This fake device models that: `readDatabase` lists a track only once
 * `syncDeviceDB` has been called.
 */

const h = vi.hoisted(() => ({
  state: {
    flushed: false,
    uploads: [] as unknown[],
    reads: 0,
    storedSize: 8,
    storedAlbum: "Fallen",
    visibleAfterReads: 1,
    progressDuringUpload: [] as number[],
  },
}));

vi.mock("zunesync-ts", () => {
  class FakeZune {
    static async open() {
      return new FakeZune();
    }

    async readDatabase() {
      h.state.reads += 1;
      const visible = h.state.flushed && h.state.reads >= h.state.visibleAfterReads;
      // List every uploaded track once flushed, so a multi-song sync settles
      // instead of waiting out the verification budget for a track the fake
      // never reports.
      const uploaded = h.state.uploads as {
        metadata?: { name?: string; albumName?: string; artist?: string };
      }[];
      const tracks = uploaded.map((upload) => ({
        title: upload.metadata?.name ?? "Going Under",
        album: upload.metadata?.albumName ?? h.state.storedAlbum,
        artist: upload.metadata?.artist ?? "Evanescence",
        size: h.state.storedSize,
      }));
      return {
        tracks: visible ? tracks : [],
        albums: {},
        artists: {},
        genres: {},
        playlists: [],
      };
    }

    createSession() {
      return {
        begin: async () => undefined,
        track: () => undefined,
        commit: async () => undefined,
        rollback: async () => undefined,
      };
    }

    async uploadTracks(tracks: unknown[], options?: { onTrackUploaded?: (c: number, t: number) => void }) {
      h.state.uploads.push(...tracks);
      // Drive the per-track callback the way the real uploader does.
      for (let i = 1; i <= tracks.length; i++) {
        options?.onTrackUploaded?.(i, tracks.length);
        h.state.progressDuringUpload.push(i);
      }
    }

    async syncDeviceDB() {
      h.state.flushed = true;
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
  resolveSongBytesWithCache: async () => new ArrayBuffer(8),
  resolveThroughSource: async () => null,
}));

vi.mock("@/lib/metadata/artwork/getArtworkForSong", () => ({
  getArtworkForSong: async () => [
    { songId: "song-1", hasEmbedded: true, full: new Blob([new Uint8Array(16)]) },
  ],
}));

const { ZuneSyncStrategy } = await import("./ZuneSyncStrategy");

const song = {
  id: "song-1",
  title: "Going Under",
  album: "Fallen",
  artist: "Evanescence",
  filename: "01 Going Under.mp3",
  duration: 180,
} as unknown as Song;

const second = {
  id: "song-2",
  title: "Bring Me To Life",
  album: "Fallen",
  artist: "Evanescence",
  filename: "02 Bring Me To Life.mp3",
} as unknown as Song;

const device = {
  id: "zune-8",
  name: "Zune 8",
  createdAt: 0,
  type: "zune",
  connected: true,
  usb: {
    vendorId: 0x045e,
    productId: 0x0710,
    serialNumber: "c80291cc-ca81-b58b-82d8-26eeadcc0ce8",
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
} as unknown as SyncDevice;

describe("ZuneSyncStrategy verification", () => {
  beforeEach(() => {
    h.state.flushed = false;
    h.state.uploads = [];
    h.state.reads = 0;
    h.state.storedSize = 8;
    h.state.storedAlbum = "Fallen";
    h.state.visibleAfterReads = 1;
    h.state.progressDuringUpload = [];
  });

  it("flushes the device database before re-reading it", async () => {
    const summary = await new ZuneSyncStrategy().sync(device, [song], []);

    expect(summary.added).toEqual(["song-1"]);
    expect(summary.unverified).toEqual([]);
  });

  it("warns when the device stored fewer bytes than were sent", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    h.state.storedSize = 14;

    await new ZuneSyncStrategy().sync(device, [song], []);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("stored 14 bytes but 8 were sent")
    );
    warn.mockRestore();
  });

  /**
   * The device rejected the album object with `0xa801` on its `Name`, so the
   * track's album reference does not resolve and the re-read track has an
   * empty album. Identity is title+album+artist, so the exact key misses and
   * the song was reported "written but not found" even though it is listed.
   */
  it("matches a track whose album reference did not resolve", async () => {
    h.state.storedAlbum = "";

    const summary = await new ZuneSyncStrategy().sync(device, [song], []);

    expect(summary.added).toEqual(["song-1"]);
    expect(summary.unverified).toEqual([]);
  });

  /**
   * The device does not publish the flushed tracks in its ZMDB immediately:
   * the first re-read after `SyncDeviceDB` still returns the pre-sync
   * database. A single-shot re-read therefore reports every uploaded song as
   * missing even though the write succeeded and the tracks appear moments
   * later.
   */
  it("re-reads until the flushed tracks appear", async () => {
    h.state.visibleAfterReads = 3;

    const summary = await new ZuneSyncStrategy().sync(device, [song], []);

    expect(summary.added).toEqual(["song-1"]);
    expect(summary.unverified).toEqual([]);
    expect(h.state.reads).toBeGreaterThanOrEqual(3);
  });

  /**
   * A Zune 120 holds far more than a Zune 8 and takes longer to rebuild its
   * ZMDB. The wait used to be a fixed 6 attempts at 400 ms (~2.4 s), so a
   * slower device expired the window first and every track was reported
   * "written but not found" even though the music was on the device and
   * played. The wait is now a time budget, so a late publish still verifies.
   */
  it("verifies a track the device publishes after the old attempt limit", async () => {
    h.state.visibleAfterReads = 10;

    const summary = await new ZuneSyncStrategy().sync(device, [song], []);

    expect(summary.added).toEqual(["song-1"]);
    expect(summary.unverified).toEqual([]);
  });

  /**
   * The device keeps artwork per track object, so a track uploaded without
   * `albumArt` renders a blank tile on the Zune.
   */
  it("uploads the song's cover art with the track", async () => {
    await new ZuneSyncStrategy().sync(device, [song], []);

    const upload = h.state.uploads[0] as {
      metadata?: { albumArt?: { data: Uint8Array; format: number } };
    };

    expect(upload.metadata?.albumArt?.data.byteLength).toBe(16);
    expect(upload.metadata?.albumArt?.format).toBe(0x3801);
  });

  /**
   * Progress was only reported in the verification loop, after every upload
   * had finished, so the UI sat at 0/N and then jumped to N/N — every track
   * appearing to sync at once.
   */
  it("reports progress as each track is written", async () => {
    const seen: number[] = [];

    await new ZuneSyncStrategy().sync(device, [song, second], [], (completed) => {
      seen.push(completed);
    });

    // The uploader drove per-track progress itself, before verification ran.
    expect(h.state.progressDuringUpload).toEqual([1, 2]);
    expect(seen).toContain(1);
    expect(seen[seen.length - 1]).toBe(2);
  });

  /**
   * `Song.duration` is seconds, but MTP specifies `Duration` in milliseconds.
   * Writing it raw stored 240 for a 4-minute track, which the device then
   * reported back as seconds.
   */
  it("writes the track duration in milliseconds", async () => {
    await new ZuneSyncStrategy().sync(device, [song], []);

    const upload = h.state.uploads[0] as {
      metadata?: { duration?: number };
    };

    expect(upload.metadata?.duration).toBe(180_000);
  });
});
