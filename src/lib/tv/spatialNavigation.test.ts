import { describe, expect, it } from "vitest";
import {
  normalizeKey,
  pickNearest,
  type Candidate,
  type Rect,
} from "./spatialNavigation";

function rect(left: number, top: number, width = 100, height = 40): Rect {
  return { left, top, right: left + width, bottom: top + height };
}

function candidates(
  entries: [string, Rect][]
): Candidate<string>[] {
  return entries.map(([item, r]) => ({ item, rect: r }));
}

describe("pickNearest", () => {
  const row = candidates([
    ["a", rect(0, 0)],
    ["b", rect(120, 0)],
    ["c", rect(240, 0)],
  ]);

  it("moves right along a row", () => {
    expect(pickNearest(rect(120, 0), row, "right")).toBe("c");
  });

  it("moves left along a row", () => {
    expect(pickNearest(rect(120, 0), row, "left")).toBe("a");
  });

  it("returns null at the end of a row", () => {
    expect(pickNearest(rect(240, 0), row, "right")).toBeNull();
  });

  it("prefers the aligned card in a grid", () => {
    const grid = candidates([
      ["top-left", rect(0, 0)],
      ["top-right", rect(120, 0)],
      ["bottom-left", rect(0, 60)],
      ["bottom-right", rect(120, 60)],
    ]);
    expect(pickNearest(rect(0, 0), grid, "down")).toBe("bottom-left");
    expect(pickNearest(rect(120, 0), grid, "down")).toBe("bottom-right");
  });

  it("ignores candidates that are not ahead", () => {
    const behind = candidates([["behind", rect(0, 0)]]);
    expect(pickNearest(rect(120, 0), behind, "right")).toBeNull();
  });

  it("takes the nearer of two candidates in the same direction", () => {
    const two = candidates([
      ["far", rect(400, 0)],
      ["near", rect(140, 0)],
    ]);
    expect(pickNearest(rect(0, 0), two, "right")).toBe("near");
  });

  it("prefers a small drift over a large one", () => {
    const two = candidates([
      ["aligned", rect(140, 0)],
      ["below", rect(140, 200)],
    ]);
    expect(pickNearest(rect(0, 0), two, "right")).toBe("aligned");
  });

  it("treats a 3 px shift as not ahead", () => {
    const two = candidates([["almost", rect(3, 0)]]);
    expect(pickNearest(rect(0, 0), two, "right")).toBeNull();
  });

  it("falls back to the nearest candidate when nothing is aligned vertically", () => {
    // A header icon far to the right of centred page content: nothing
    // overlaps it horizontally, so the strict rule would find nothing.
    const page = candidates([
      ["back", rect(300, 90)],
      ["theme", rect(348, 261)],
    ]);
    expect(pickNearest(rect(1200, 12, 34, 34), page, "down")).toBe("back");
  });

  it("still refuses a horizontal jump into another band", () => {
    // Right from the last card in a row must not land on the player bar.
    const bar = candidates([["volume", rect(600, 500, 40, 40)]]);
    expect(pickNearest(rect(0, 0, 100, 40), bar, "right")).toBeNull();
  });

  it("prefers the next row over a nearer control further down", () => {
    // Settings page: from the header icon the Theme buttons sit in the first
    // card far to the left, while a runtime filter sits lower but closer
    // horizontally. The next row must win.
    const page = candidates([
      ["theme", rect(30, 200, 120, 40)],
      ["runtimes", rect(816, 596, 200, 40)],
    ]);
    expect(pickNearest(rect(1212, 15, 40, 40), page, "down")).toBe("theme");
  });

  it("keeps the column when the next row has several controls", () => {
    const page = candidates([
      ["left", rect(0, 200, 120, 40)],
      ["right", rect(600, 200, 120, 40)],
    ]);
    expect(pickNearest(rect(600, 100, 40, 40), page, "down")).toBe("right");
  });
});

describe("normalizeKey", () => {
  it("maps the Fire TV D-pad key codes", () => {
    expect(normalizeKey({ key: "Unidentified", keyCode: 38 })).toBe("ArrowUp");
    expect(normalizeKey({ key: "Unidentified", keyCode: 40 })).toBe(
      "ArrowDown"
    );
    expect(normalizeKey({ key: "Unidentified", keyCode: 37 })).toBe(
      "ArrowLeft"
    );
    expect(normalizeKey({ key: "Unidentified", keyCode: 39 })).toBe(
      "ArrowRight"
    );
  });

  it("maps Select and Back", () => {
    expect(normalizeKey({ key: "Unidentified", keyCode: 13 })).toBe("Enter");
    expect(normalizeKey({ key: "Unidentified", keyCode: 4 })).toBe(
      "BrowserBack"
    );
  });

  it("maps the media keys", () => {
    expect(normalizeKey({ key: "Unidentified", keyCode: 179 })).toBe(
      "MediaPlayPause"
    );
    expect(normalizeKey({ key: "Unidentified", keyCode: 227 })).toBe(
      "MediaRewind"
    );
    expect(normalizeKey({ key: "Unidentified", keyCode: 228 })).toBe(
      "MediaFastForward"
    );
  });

  it("maps the legacy D-pad key names", () => {
    expect(normalizeKey({ key: "Up" })).toBe("ArrowUp");
    expect(normalizeKey({ key: "Select" })).toBe("Enter");
    expect(normalizeKey({ key: "GoBack" })).toBe("BrowserBack");
  });

  it("keeps a standard key name as-is", () => {
    expect(normalizeKey({ key: "ArrowLeft", keyCode: 38 })).toBe("ArrowLeft");
    expect(normalizeKey({ key: "Enter", keyCode: 13 })).toBe("Enter");
  });

  it("returns an empty string when nothing is known", () => {
    expect(normalizeKey({ key: "Unidentified", keyCode: 999 })).toBe("");
  });

  it("falls back to `which` when keyCode is 0", () => {
    expect(normalizeKey({ key: "Unidentified", keyCode: 0, which: 40 })).toBe(
      "ArrowDown"
    );
    expect(normalizeKey({ key: "Unidentified", keyCode: 0, which: 13 })).toBe(
      "Enter"
    );
  });

  it("falls back to `code` when the key name is missing", () => {
    expect(normalizeKey({ key: "Unidentified", code: "ArrowLeft" })).toBe(
      "ArrowLeft"
    );
    expect(normalizeKey({ key: "Unidentified", code: "NumpadEnter" })).toBe(
      "Enter"
    );
    expect(normalizeKey({ key: "Unidentified", code: "MediaPlayPause" })).toBe(
      "MediaPlayPause"
    );
  });

  it("ignores an unknown `code`", () => {
    expect(normalizeKey({ key: "Unidentified", code: "KeyF" })).toBe("");
  });
});
