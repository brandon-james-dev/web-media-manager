import { describe, expect, it, vi } from "vitest";

/**
 * The device sync runs inside the worker pool. This pins the two things the
 * UI depends on: progress is reported per song, and a cancelled run stops
 * early and reports itself as cancelled rather than as a failure (so the
 * queue is left in place).
 */

const { syncMock } = vi.hoisted(() => ({
  syncMock: vi.fn(),
}));

vi.mock("@/lib/sync/SyncService", () => ({
  SyncService: class {
    sync = syncMock;
  },
}));

const { runDeviceSync } = await import("./runDeviceSync");

const device = { id: "dev-1", name: "iPod", type: "iPod" } as never;
const songs = [{ id: "a" }, { id: "b" }, { id: "c" }] as never;

describe("runDeviceSync", () => {
  it("reports each song as worker progress", async () => {
    syncMock.mockImplementation(async (_d, _s, _p, onProgress) => {
      onProgress?.(1, 3, { songId: "a", status: "verified" });
      onProgress?.(2, 3, { songId: "b", status: "verified" });
      onProgress?.(3, 3, { songId: "c", status: "present" });
      return { added: ["a", "b"], unverified: [], alreadyPresent: ["c"], skipped: [] };
    });

    const seen: unknown[] = [];
    const result = await runDeviceSync(
      { device, songs, playlists: [] },
      () => false,
      (progress) => seen.push(progress)
    );

    expect(seen).toEqual([
      {
        index: 1,
        total: 3,
        percent: 1 / 3,
        label: "Writing 1 of 3",
        data: { songId: "a", status: "verified" },
      },
      {
        index: 2,
        total: 3,
        percent: 2 / 3,
        label: "Writing 2 of 3",
        data: { songId: "b", status: "verified" },
      },
      {
        index: 3,
        total: 3,
        percent: 1,
        label: "Writing 3 of 3",
        data: { songId: "c", status: "present" },
      },
    ]);
    expect(result).toEqual({
      cancelled: false,
      summary: {
        added: ["a", "b"],
        unverified: [],
        alreadyPresent: ["c"],
        skipped: [],
      },
    });
  });

  it("stops and reports cancellation instead of throwing", async () => {
    let cancelled = false;

    syncMock.mockImplementation(async (_d, _s, _p, onProgress) => {
      onProgress?.(1, 3, { songId: "a", status: "verified" });
      cancelled = true;
      // The next report is where the strategy notices the cancel.
      onProgress?.(2, 3, { songId: "b", status: "verified" });
      onProgress?.(3, 3, { songId: "c", status: "verified" });
    });

    const result = await runDeviceSync(
      { device, songs, playlists: [] },
      () => cancelled,
      () => undefined
    );

    expect(result).toEqual({ cancelled: true });
  });

  it("propagates a real failure", async () => {
    syncMock.mockRejectedValue(new Error("device unplugged"));

    await expect(
      runDeviceSync({ device, songs, playlists: [] }, () => false, () => {})
    ).rejects.toThrow("device unplugged");
  });
});
