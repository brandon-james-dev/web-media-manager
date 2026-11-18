import { describe, expect, it } from "vitest";
import type { IRNode, IRValue } from "../../ir";
import {
  commonStyle,
  gridItemStyle,
  gridStyle,
  isVisible,
  stackItemStyle,
  stackStyle,
} from "./layoutStyle";

function node(
  element: string,
  attributes: Record<string, IRValue> = {}
): IRNode {
  return { element, attributes, children: [] };
}

describe("stackStyle", () => {
  it("is a vertical flex container by default", () => {
    expect(stackStyle(node("Stack"))).toEqual({
      display: "flex",
      flexDirection: "column",
    });
  });

  it("maps gap, align and justify", () => {
    const style = stackStyle(
      node("Stack", {
        orientation: "horizontal",
        gap: 4,
        align: "center",
        justify: "spaceBetween",
      })
    );
    expect(style.flexDirection).toBe("row");
    expect(style.gap).toBe("4px");
    expect(style.alignItems).toBe("center");
    expect(style.justifyContent).toBe("space-between");
  });

  it("scrolls on the main axis only", () => {
    expect(
      stackStyle(
        node("Stack", { orientation: "horizontal", overflow: "scroll" })
      ).overflowX
    ).toBe("auto");
    expect(stackStyle(node("Stack", { overflow: "scroll" })).overflowY).toBe(
      "auto"
    );
  });

  it("wraps only when horizontal", () => {
    expect(
      stackStyle(node("Stack", { orientation: "horizontal", wrap: true }))
        .flexWrap
    ).toBe("wrap");
    expect(stackStyle(node("Stack", { wrap: true })).flexWrap).toBeUndefined();
  });
});

describe("stackItemStyle", () => {
  it("shares leftover space by the grow share", () => {
    expect(stackItemStyle(node("SearchBox", { grow: 1 }))).toEqual({
      flex: "1 1 0",
      minWidth: 0,
      minHeight: 0,
    });
  });

  it("leaves a child without grow at its natural size", () => {
    expect(stackItemStyle(node("SearchBox"))).toEqual({});
    expect(stackItemStyle(node("SearchBox", { grow: 0 }))).toEqual({});
  });

  it("aligns a child on the cross axis of its stack", () => {
    expect(stackItemStyle(node("Artwork", { hAlign: "center" }))).toEqual({
      alignSelf: "center",
      maxWidth: "100%",
    });
    expect(stackItemStyle(node("Artwork", { vAlign: "end" }), true)).toEqual({
      alignSelf: "flex-end",
      maxHeight: "100%",
    });
    expect(stackItemStyle(node("Artwork", { vAlign: "end" }))).toEqual({});
  });
});

describe("gridStyle", () => {
  it("maps pixel, star and auto tracks", () => {
    const style = gridStyle(
      node("Grid", {
        columns: [
          { type: "px", value: 220 },
          { type: "star", share: 1 },
          { type: "star", share: 2 },
          { type: "auto" },
        ],
        rows: [{ type: "auto" }, { type: "star", share: 1 }],
        columnGap: 4,
        rowGap: 8,
      })
    );
    expect(style.gridTemplateColumns).toBe(
      "220px minmax(0,1fr) minmax(0,2fr) auto"
    );
    expect(style.gridTemplateRows).toBe("auto minmax(0,1fr)");
    expect(style.columnGap).toBe("4px");
    expect(style.rowGap).toBe("8px");
  });

  it("uses one star track when an axis is omitted", () => {
    const style = gridStyle(node("Grid"));
    expect(style.gridTemplateColumns).toBe("minmax(0,1fr)");
    expect(style.gridTemplateRows).toBe("minmax(0,1fr)");
  });
});

describe("gridItemStyle", () => {
  it("places the child in a one-based cell with its spans", () => {
    expect(
      gridItemStyle(node("LibraryBrowser", { row: 0, column: 1, rowSpan: 2 }))
    ).toEqual({
      gridRow: "1 / span 2",
      gridColumn: "2 / span 1",
      minWidth: 0,
      minHeight: 0,
      justifySelf: "stretch",
      alignSelf: "stretch",
    });
  });

  it("defaults to the first cell with unit spans", () => {
    expect(gridItemStyle(node("TrackList"))).toEqual({
      gridRow: "1 / span 1",
      gridColumn: "1 / span 1",
      minWidth: 0,
      minHeight: 0,
      justifySelf: "stretch",
      alignSelf: "stretch",
    });
  });

  it("maps hAlign and vAlign to self alignment in the cell", () => {
    expect(
      gridItemStyle(node("Panel", { hAlign: "end", vAlign: "center" }))
    ).toMatchObject({ justifySelf: "flex-end", alignSelf: "center" });
  });
});

describe("commonStyle", () => {
  it("maps lengths to pixels and leaves auto unset", () => {
    const style = commonStyle(
      node("Panel", { width: 220, height: "auto", minHeight: 56 })
    );
    expect(style.width).toBe("220px");
    expect(style.height).toBeUndefined();
    expect(style.minHeight).toBe("56px");
  });

  it("writes a thickness as logical margins", () => {
    expect(commonStyle(node("Panel", { margin: [1, 2, 3, 4] }))).toEqual({
      marginBlockStart: "1px",
      marginInlineEnd: "2px",
      marginBlockEnd: "3px",
      marginInlineStart: "4px",
    });
  });

  it("is empty when nothing is set", () => {
    expect(commonStyle(node("Panel"))).toEqual({});
  });
});

describe("isVisible", () => {
  it("hides a node marked invisible", () => {
    expect(isVisible(node("Button", { visible: false }))).toBe(false);
  });

  it("shows a node that does not set the attribute", () => {
    expect(isVisible(node("Button"))).toBe(true);
  });

  it("shows a library-mode node only in its mode", () => {
    const editor = node("MetadataEditor", { libraryMode: "edit" });
    expect(isVisible(editor)).toBe(false);
    expect(isVisible(editor, "edit")).toBe(true);
    expect(isVisible(node("Panel", { libraryMode: "playback" }))).toBe(true);
  });
});
