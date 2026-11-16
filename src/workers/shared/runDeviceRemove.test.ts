import { beforeEach, describe, expect, it, vi } from "vitest";

const removeTracks = vi.fn(
  async (
    _device: unknown,
    _ids: number[],
    _onProgress?: (completed: number, total: number) => void
  ): Promise<void> => {}
);

vi.mock("@/lib/sync/SyncService", () => ({
  SyncService: class {
    removeTracks = removeTracks;
  },
}));

const { runDeviceRemove } = await import("./runDeviceRemove");

const device = { id: "dev1", name: "Zune 120" } as never;

/**
 * The device removal runs in the worker, so its progress contract is what the
 * removal notification's bar reads. A missing or duplicated event leaves the
 * bar stuck part-way.
 */

describe("runDeviceRemove", () => {
  beforeEach(() => {
    removeTracks.mockClear();
  });

  it("reports one event per track", async () => {
    removeTracks.mockImplementation(
      async (
      _device: unknown,
      _ids: number[],
      onProgress?: (c: number, t: number) => void
    ) => {
        onProgress?.(1, 2);
        onProgress?.(2, 2);
      }
    );

    const events: any[] = [];

    const result = await runDeviceRemove(
      { device, trackIds: [10, 11] },
      () => false,
      (progress) => events.push(progress)
    );

    expect(result).toEqual({ cancelled: false, removed: 2 });
    expect(events.map((event) => event.index)).toEqual([1, 2]);
    expect(events.every((event) => event.total === 2)).toBe(true);
    expect(events.at(-1)?.percent).toBe(1);
  });

  it("stops when the job is cancelled", async () => {
    let cancelled = false;

    removeTracks.mockImplementation(
      async (
      _device: unknown,
      _ids: number[],
      onProgress?: (c: number, t: number) => void
    ) => {
        onProgress?.(1, 2);
        cancelled = true;
        onProgress?.(2, 2);
      }
    );

    const result = await runDeviceRemove(
      { device, trackIds: [10, 11] },
      () => cancelled,
      () => {}
    );

    expect(result.cancelled).toBe(true);
    expect(result.removed).toBe(1);
  });
});
