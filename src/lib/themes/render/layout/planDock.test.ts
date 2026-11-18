import { describe, expect, it } from "vitest";
import type { IRNode, IRValue } from "../../ir";
import { planDock, planDockTree } from "./planDock";

function node(
  element: string,
  attributes: Record<string, IRValue> = {}
): IRNode {
  return { element, attributes, children: [] };
}

function docked(dock: string): IRNode {
  return node("Panel", { dock });
}

describe("planDock", () => {
  it("keeps document order and marks the fill child", () => {
    const children = [
      docked("top"),
      docked("bottom"),
      docked("start"),
      docked("fill"),
    ];
    expect(planDock(children).map((slot) => slot.edge)).toEqual([
      "top",
      "bottom",
      "start",
      "fill",
    ]);
  });

  it("fills with the first child marked fill", () => {
    const children = [docked("fill"), docked("top"), docked("start")];
    expect(planDock(children).map((slot) => slot.edge)).toEqual([
      "fill",
      "top",
      "start",
    ]);
  });

  it("fills with the last child when none is marked", () => {
    const children = [docked("top"), docked("start"), node("TrackList")];
    expect(planDock(children).map((slot) => slot.edge)).toEqual([
      "top",
      "start",
      "fill",
    ]);
  });

  it("docks a child without the attribute to the top", () => {
    expect(planDock([node("Panel"), docked("fill")])[0].edge).toBe("top");
  });

  it("returns nothing for an empty panel", () => {
    expect(planDock([])).toEqual([]);
  });
});

describe("planDockTree", () => {
  it("nests a collapsible end panel before the fill child", () => {
    const children = [
      node("Panel", { dock: "top" }),
      node("Panel", { dock: "bottom" }),
      node("Panel", { id: "list-pane", dock: "end", collapsible: true }),
      node("PageHost", { dock: "fill" }),
    ];
    const edges: string[] = [];
    let tree = planDockTree(children);
    while (tree.kind === "dock") {
      edges.push(tree.edge);
      tree = tree.rest;
    }
    expect(edges).toEqual(["top", "bottom", "end"]);
    expect(tree.node?.element).toBe("PageHost");
  });
  it("nests the docked children in document order", () => {
    const children = [
      docked("top"),
      docked("bottom"),
      docked("start"),
      docked("fill"),
    ];
    const tree = planDockTree(children);
    expect(tree.kind).toBe("dock");
    if (tree.kind !== "dock") return;
    expect(tree.edge).toBe("top");
    expect(tree.rest.kind).toBe("dock");
    if (tree.rest.kind !== "dock") return;
    expect(tree.rest.edge).toBe("bottom");
    expect(tree.rest.rest.kind).toBe("dock");
    if (tree.rest.rest.kind !== "dock") return;
    expect(tree.rest.rest.edge).toBe("start");
    expect(tree.rest.rest.rest).toEqual({
      kind: "fill",
      node: children[3],
    });
  });

  it("is a single fill slot when nothing is docked", () => {
    const child = node("TrackList");
    expect(planDockTree([child])).toEqual({ kind: "fill", node: child });
  });

  it("has no fill node for an empty panel", () => {
    expect(planDockTree([])).toEqual({ kind: "fill", node: undefined });
  });
});
