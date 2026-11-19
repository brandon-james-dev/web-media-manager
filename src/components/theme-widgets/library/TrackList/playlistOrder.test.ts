import { describe, expect, it } from "vitest";
import {
  cycleTrackSort,
  moveIndexWithin,
  reorderTarget,
} from "./playlistOrder";

describe("cycleTrackSort", () => {
  it("starts a column ascending and reverses it on the next click", () => {
    expect(cycleTrackSort(undefined, "title", false)).toEqual({
      column: "title",
      desc: false,
    });
    expect(
      cycleTrackSort({ column: "title", desc: false }, "title", false)
    ).toEqual({ column: "title", desc: true });
    expect(
      cycleTrackSort({ column: "title", desc: true }, "title", false)
    ).toEqual({ column: "title", desc: false });
  });

  it("starts a different column ascending", () => {
    expect(
      cycleTrackSort({ column: "title", desc: true }, "artist", false)
    ).toEqual({ column: "artist", desc: false });
  });

  it("returns to the playlist order on the third click", () => {
    const ascending = cycleTrackSort(undefined, "title", true);
    expect(ascending).toEqual({ column: "title", desc: false });
    const descending = cycleTrackSort(ascending, "title", true);
    expect(descending).toEqual({ column: "title", desc: true });
    expect(cycleTrackSort(descending, "title", true)).toBeUndefined();
  });

  it("starts a different column ascending in playlist order", () => {
    expect(
      cycleTrackSort({ column: "title", desc: true }, "artist", true)
    ).toEqual({ column: "artist", desc: false });
  });
});

describe("moveIndexWithin", () => {
  it("moves one slot and stays inside the list", () => {
    expect(moveIndexWithin(2, 1, 5)).toBe(3);
    expect(moveIndexWithin(2, -1, 5)).toBe(1);
    expect(moveIndexWithin(0, -1, 5)).toBe(0);
    expect(moveIndexWithin(4, 1, 5)).toBe(4);
  });

  it("returns zero for an empty list", () => {
    expect(moveIndexWithin(0, 1, 0)).toBe(0);
  });
});

describe("reorderTarget", () => {
  it("lands one slot earlier when the line is below the row", () => {
    expect(reorderTarget(1, 4)).toBe(3);
  });

  it("lands on the line when it is above the row", () => {
    expect(reorderTarget(3, 1)).toBe(1);
  });

  it("keeps a drop at the top of the list at the first slot", () => {
    expect(reorderTarget(2, 0)).toBe(0);
  });
});
