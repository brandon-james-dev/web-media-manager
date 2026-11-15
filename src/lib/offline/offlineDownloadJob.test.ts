import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Song } from "@/models";

const resolveThroughSource = vi.fn(
  async (): Promise<ArrayBuffer | null> => new ArrayBuffer(8)
);

vi.mock("./songOffline", () => ({ resolveThroughSource }));

const enqueued: { type: string; payload: any }[] = [];
let completedListener: ((job: any) => void) | undefined;

const fakeService = {
  enqueue: (job: any, jobId: string) => {
    enqueued.push(job);
    // The worker writes the items and reports back, as the real pool does.
    queueMicrotask(() =>
      completedListener?.({
        id: jobId,
        type: job.type,
        result: {
          cancelled: false,
          cached: job.payload.items.length,
          failed: [],
        },
      })
    );
  },
  onJobCompleted: (cb: (job: any) => void) => {
    completedListener = cb;
    return () => {
      completedListener = undefined;
    };
  },
};

vi.mock("@/core/jobs", () => ({
  getJobService: () => fakeService,
}));

const { runOfflineDownloadJob } = await import("./offlineDownloadJob");
const { getOfflineDownloadSnapshot, resetOfflineBatches } = await import(
  "./offlineDownloads"
);

const song = (id: string): Song => ({
  id,
  sourceId: "remote",
  relativePath: `${id}.mp3`,
  filename: `${id}.mp3`,
  filesize: 8,
  title: `Song ${id}`,
  album: "Album X",
  artist: "Artist",
});

/**
 * The album download runs through this job. It has to hand the fetched audio
 * to the worker, apply the worker's result, and always finish the batch —
 * otherwise the album ring sticks at a partial count and nothing is cached.
 */

describe("runOfflineDownloadJob", () => {
  beforeEach(() => {
    resolveThroughSource.mockClear();
    enqueued.length = 0;
    completedListener = undefined;
    resetOfflineBatches();
  });

  it("hands fetched audio to the worker and reports what it cached", async () => {
    const result = await runOfflineDownloadJob(
      [song("1"), song("2")],
      "album:Album X:Artist"
    );

    expect(resolveThroughSource).toHaveBeenCalledTimes(2);
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0].type).toBe("Offline Download");
    expect(enqueued[0].payload.items.map((i: any) => i.songId)).toEqual([
      "1",
      "2",
    ]);
    expect(result).toEqual({ cached: 2, failed: [] });
  });

  it("completes the batch so the album ring does not stick", async () => {
    await runOfflineDownloadJob([song("1")], "album:Album X:Artist");

    const batch = getOfflineDownloadSnapshot().get("album:Album X:Artist");

    expect(batch?.state).toBe("completed");
    expect(batch?.completed).toBe(1);
  });

  it("skips songs whose audio cannot be read and still finishes", async () => {
    resolveThroughSource
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(new ArrayBuffer(8));

    const result = await runOfflineDownloadJob(
      [song("1"), song("2")],
      "album:Album X:Artist"
    );

    expect(enqueued[0].payload.items.map((i: any) => i.songId)).toEqual(["2"]);
    expect(result.failed).toEqual(["Song 1"]);
    expect(
      getOfflineDownloadSnapshot().get("album:Album X:Artist")?.state
    ).toBe("completed");
  });

  it("does not enqueue a worker job when nothing resolved", async () => {
    resolveThroughSource.mockResolvedValue(null);

    const result = await runOfflineDownloadJob(
      [song("1")],
      "album:Album X:Artist"
    );

    expect(enqueued).toHaveLength(0);
    expect(result).toEqual({ cached: 0, failed: ["Song 1"] });
  });
});
