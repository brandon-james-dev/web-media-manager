import { describe, expect, it, vi } from "vitest";

const clearStore = vi.fn(async () => {});
const clearHiddenTracks = vi.fn(async () => {});

vi.mock("@/core/ports", () => ({
  getStore: () => ({ clearStore }),
  getPlaylistStore: () => ({ clearStore }),
  getPlayHistoryStore: () => ({ clearStore }),
}));

vi.mock("@/lib/hidden-songs", () => ({ clearHiddenTracks }));

const { clearLibrary } = await import("./clearLibrary");

/**
 * A wipe has to take the hidden set with it: its rows are keyed by song id, so
 * leaving them behind keeps entries that point at songs which no longer exist.
 */
describe("clearLibrary", () => {
  it("clears the hidden set alongside the library", async () => {
    clearStore.mockClear();
    clearHiddenTracks.mockClear();

    await clearLibrary();

    expect(clearStore).toHaveBeenCalledTimes(3);
    expect(clearHiddenTracks).toHaveBeenCalledTimes(1);
  });
});
