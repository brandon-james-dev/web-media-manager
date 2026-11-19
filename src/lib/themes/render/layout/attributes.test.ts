import { describe, expect, it } from "vitest";
import type { IRNode, IRValue } from "../../ir";
import {
  attrBool,
  attrList,
  attrNumber,
  attrRef,
  attrString,
  elementCategory,
  isWidget,
  readAttr,
} from "./attributes";

function node(
  element: string,
  attributes: Record<string, IRValue> = {}
): IRNode {
  return { element, attributes, children: [] };
}

describe("readAttr", () => {
  it("returns the compiled value", () => {
    const stack = node("Stack", { orientation: "horizontal" });
    expect(readAttr(stack, "orientation")).toBe("horizontal");
  });

  it("falls back to the component model default", () => {
    expect(readAttr(node("Stack"), "orientation")).toBe("vertical");
    expect(readAttr(node("Panel"), "collapsible")).toBe("false");
  });

  it("returns undefined when the model declares no default", () => {
    expect(readAttr(node("Stack"), "gap")).toBeUndefined();
    expect(readAttr(node("Unknown"), "gap")).toBeUndefined();
  });
});

describe("attrString", () => {
  it("returns a string value", () => {
    expect(attrString(node("Page", { role: "library" }), "role")).toBe(
      "library"
    );
  });

  it("ignores a non-string value", () => {
    expect(attrString(node("Panel", { width: 220 }), "width")).toBeUndefined();
  });
});

describe("attrList", () => {
  it("returns a compiled list", () => {
    const info = node("TrackInfo", { trailing: ["elapsedAndTotal"] });
    expect(attrList(info, "trailing")).toEqual(["elapsedAndTotal"]);
  });

  it("splits a string value", () => {
    const info = node("TrackInfo", { fields: "title  artist" });
    expect(attrList(info, "fields")).toEqual(["title", "artist"]);
  });

  it("ignores a non-list value", () => {
    expect(attrList(node("TrackInfo"), "trailing")).toBeUndefined();
    expect(attrList(node("Panel", { width: 220 }), "width")).toBeUndefined();
  });
});

describe("attrNumber", () => {
  it("returns a numeric value", () => {
    expect(attrNumber(node("Grid", { row: 2 }), "row")).toBe(2);
  });

  it("parses a numeric default", () => {
    expect(attrNumber(node("Grid"), "row")).toBe(0);
    expect(attrNumber(node("Grid"), "rowSpan")).toBe(1);
  });

  it("does not parse a keyword default", () => {
    expect(attrNumber(node("Panel"), "width")).toBeUndefined();
  });
});

describe("attrBool", () => {
  it("returns a compiled boolean", () => {
    expect(attrBool(node("Panel", { collapsible: true }), "collapsible")).toBe(
      true
    );
  });

  it("parses a boolean default", () => {
    expect(attrBool(node("Panel"), "collapsible")).toBe(false);
  });

  it("returns undefined when the attribute is absent and has no default", () => {
    expect(attrBool(node("Image"), "decorative")).toBeUndefined();
  });
});

describe("attrRef", () => {
  it("returns the id of a reference of the expected kind", () => {
    const panel = node("Panel", { style: { ref: "panel", id: "chrome" } });
    expect(attrRef(panel, "style", "panel")).toBe("chrome");
  });

  it("rejects a reference of another kind", () => {
    const panel = node("Panel", { style: { ref: "panel", id: "chrome" } });
    expect(attrRef(panel, "style", "button")).toBeUndefined();
  });

  it("rejects a literal value", () => {
    expect(attrRef(node("Panel", { style: "chrome" }), "style", "panel")).toBe(
      undefined
    );
  });
});

describe("isWidget", () => {
  it("is true for a widget element", () => {
    expect(isWidget(node("TrackList"))).toBe(true);
  });

  it("is false for a primitive and an unknown element", () => {
    expect(isWidget(node("Grid"))).toBe(false);
    expect(isWidget(node("Unknown"))).toBe(false);
  });
});

describe("elementCategory", () => {
  it("returns the declared category", () => {
    expect(elementCategory(node("Panel"))).toBe("primitive");
    expect(elementCategory(node("Button"))).toBe("control");
  });

  it("returns undefined for an unknown element", () => {
    expect(elementCategory(node("Unknown"))).toBeUndefined();
  });
});
