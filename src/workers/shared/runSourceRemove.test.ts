import { beforeEach, describe, expect, it, vi } from "vitest";

const batchDelete = vi.fn(async () => undefined);
const deleteSource = vi.fn(async () => undefined);
const deleteHiddenTracksForSource = vi.fn(async () => 0);
const filter = vi.fn(async () => ({
  data: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
}));

vi.mock("@/core/ports", () => ({
  getStore: () => ({ filter, batchDelete }),
  getSourcesStore: () => ({ deleteSource }),
}));

vi.mock("@/lib/hidden", () => ({ deleteHiddenTracksForSource }));

const { runSourceRemove } = await import("./runSourceRemove");

/**
 * The source removal deletes the songs in chunks so the bar advances on a
 * large library, then drops the source record last. A cancelled run must
 * leave the source in place rather than orphaning its songs.
 */

describe("runSourceRemove", () => {
  beforeEach(() => {
    batchDelete.mockClear();
    deleteSource.mockClear();
    deleteHiddenTracksForSource.mockClear();
    filter.mockClear();
  });

  it("deletes the songs then the source record", async () => {
    const events: any[] = [];

    const result = await runSourceRemove(
      { sourceId: "loc1" },
      () => false,
      (progress) => events.push(progress)
    );

    expect(result).toEqual({ cancelled: false, removed: 3 });
    expect(batchDelete).toHaveBeenCalledWith(["s1", "s2", "s3"]);
    expect(deleteHiddenTracksForSource).toHaveBeenCalledWith("loc1");
    expect(deleteSource).toHaveBeenCalledWith("loc1");
    expect(events.at(-1)?.index).toBe(3);
    expect(events.at(-1)?.percent).toBe(1);
  });

  it("keeps the source record when the run is cancelled", async () => {
    const result = await runSourceRemove(
      { sourceId: "loc1" },
      () => true,
      () => {}
    );

    expect(result.cancelled).toBe(true);
    expect(deleteHiddenTracksForSource).not.toHaveBeenCalled();
    expect(deleteSource).not.toHaveBeenCalled();
  });
});
