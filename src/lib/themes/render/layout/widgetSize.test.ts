import { describe, expect, it } from "vitest";
import { getElementDef } from "../../componentModel";
import type { IRNode, IRValue } from "../../ir";
import { resolveWidgetMinSize } from "./widgetSize";

function node(
  element: string,
  attributes: Record<string, IRValue> = {}
): IRNode {
  return { element, attributes, children: [] };
}

describe("resolveWidgetMinSize", () => {
  it("returns the single box a definition declares", () => {
    expect(
      resolveWidgetMinSize(getElementDef("Artwork"), node("Artwork"))
    ).toEqual({ width: 24, height: 24 });
  });

  it("picks the box the variant attribute names", () => {
    expect(
      resolveWidgetMinSize(
        getElementDef("SeekBar"),
        node("SeekBar", { variant: "edge" })
      )
    ).toEqual({ width: 80, height: 2 });
    expect(
      resolveWidgetMinSize(
        getElementDef("VolumeControl"),
        node("VolumeControl", { orientation: "vertical" })
      )
    ).toEqual({ width: 16, height: 80 });
  });

  it("returns undefined when the definition declares no minimum", () => {
    expect(
      resolveWidgetMinSize(getElementDef("Backdrop"), node("Backdrop"))
    ).toBeUndefined();
  });

  it("returns undefined for an element the model does not know", () => {
    expect(resolveWidgetMinSize(undefined, node("Unknown"))).toBeUndefined();
  });

  it("returns undefined when the variant is unset or names no box", () => {
    expect(
      resolveWidgetMinSize(getElementDef("SeekBar"), node("SeekBar"))
    ).toBeUndefined();
    expect(
      resolveWidgetMinSize(
        getElementDef("SeekBar"),
        node("SeekBar", { variant: "wide" })
      )
    ).toBeUndefined();
  });
});
