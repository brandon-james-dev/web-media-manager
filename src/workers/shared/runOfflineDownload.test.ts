import { beforeEach, describe, expect, it, vi } from "vitest";

const putOfflineAudio = vi.fn(async () => ({ size: 1 }));

vi.mock("@/lib/offline/offlineAudioStore", () => ({ putOfflineAudio }));

const { runOfflineDownload } = await import("./runOfflineDownload");

const item = (id: string) => ({
  songId: id,
  sourceId: "remote",
  title: `Song ${id}`,
  bytes: new ArrayBuffer(8),
});

/**
 * The offline download writes already-fetched audio in the worker, so its
 * progress contract is what the album ring counts. A missing or duplicated
 * event leaves a card stuck at a partial count.
 */

describe("runOfflineDownload", () => {
  beforeEach(() => {
    putOfflineAudio.mockClear();
  });

  it("reports one event per song with its batch and status", async () => {
    const events: any[] = [];

    const result = await runOfflineDownload(
      { items: [item("1"), item("2")], batchId: "album:A" },
      () => false,
      (progress) => events.push(progress)
    );

    expect(result).toEqual({ cancelled: false, cached: 2, failed: [] });
    expect(events.map((event) => event.index)).toEqual([1, 2]);
    expect(events.map((event) => event.data.songId)).toEqual(["1", "2"]);
    expect(events.every((event) => event.data.batchId === "album:A")).toBe(true);
    expect(events.every((event) => event.data.status === "cached")).toBe(true);
  });

  it("counts a write failure but keeps going", async () => {
    putOfflineAudio
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce({ size: 1 });

    const events: any[] = [];

    const result = await runOfflineDownload(
      { items: [item("1"), item("2")], batchId: "album:A" },
      () => false,
      (progress) => events.push(progress)
    );

    expect(result.cached).toBe(1);
    expect(result.failed).toEqual(["Song 1"]);
    expect(events.map((event) => event.data.status)).toEqual([
      "failed",
      "cached",
    ]);
  });

  it("stops on cancel and reports what it cached so far", async () => {
    let calls = 0;

    const result = await runOfflineDownload(
      { items: [item("1"), item("2"), item("3")], batchId: "album:A" },
      () => calls++ > 0,
      () => undefined
    );

    expect(result.cancelled).toBe(true);
    expect(result.cached).toBe(1);
    expect(putOfflineAudio).toHaveBeenCalledTimes(1);
  });
});
