import { beforeEach, describe, expect, it, vi } from "vitest";

const listHiddenSongIds = vi.fn(async () => ["hidden-1"]);

vi.mock("./hiddenTrackStore", () => ({
  listHiddenSongIds,
  onHiddenTracksChanged: () => () => undefined,
}));

vi.mock("@/core/ports", () => ({
  getSourcesStore: () => ({
    onSourceDeleted: () => () => undefined,
    onSourcesCleared: () => () => undefined,
  }),
}));

const {
  getHiddenSongIdsSnapshot,
  isSongHidden,
  reloadHiddenSongIds,
  resetHiddenSongIds,
} = await import("./hiddenSongIds");

/**
 * The snapshot answers "is this song hidden?" for the song menu's label and
 * for the provider's query filter, so it has to survive a store that is not
 * wired yet and rebuild from the store on demand.
 */

describe("hidden song ids", () => {
  beforeEach(() => {
    resetHiddenSongIds();
    listHiddenSongIds.mockClear();
  });

  it("reports a hidden song", async () => {
    await reloadHiddenSongIds();

    expect(isSongHidden("hidden-1")).toBe(true);
  });

  it("leaves an unhidden song visible", async () => {
    await reloadHiddenSongIds();

    expect(isSongHidden("visible-1")).toBe(false);
  });

  it("keeps the previous ids when the store cannot be read", async () => {
    await reloadHiddenSongIds();
    listHiddenSongIds.mockRejectedValueOnce(new Error("no store"));

    await reloadHiddenSongIds();

    expect([...getHiddenSongIdsSnapshot()]).toEqual(["hidden-1"]);
  });

  it("starts empty", () => {
    expect(getHiddenSongIdsSnapshot().size).toBe(0);
  });
});
