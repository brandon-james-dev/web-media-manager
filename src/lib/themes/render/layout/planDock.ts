import type { IRNode } from "../../ir";
import { attrString } from "./attributes";

/**
 * The four edges a `DockPanel` child can peel off. `start` and `end` follow
 * reading direction, so they map to a flex row rather than to left and right.
 *
 * @example
 * ```xml
 * <Panel dock="start" width="220" />
 * ```
 * @example
 * ```ts
 * const edge: DockEdge = "start";
 * ```
 */
export const DockEdge = {
  /**
   * The leading edge of the panel's block axis.
   *
   * @example
   * ```xml
   * <Panel dock="top" height="56" />
   * ```
   */
  Top: "top",
  /**
   * The trailing edge of the panel's block axis.
   *
   * @example
   * ```xml
   * <Panel dock="bottom" height="72" />
   * ```
   */
  Bottom: "bottom",
  /**
   * The leading edge of the inline axis.
   *
   * @example
   * ```xml
   * <Panel dock="start" width="220" />
   * ```
   */
  Start: "start",
  /**
   * The trailing edge of the inline axis.
   *
   * @example
   * ```xml
   * <Panel dock="end" width="320" />
   * ```
   */
  End: "end",
} as const;

/**
 * One of the {@link DockEdge} values.
 *
 * @example
 * ```ts
 * const edge: DockEdgeValue = "bottom";
 * ```
 */
export type DockEdgeValue = (typeof DockEdge)[keyof typeof DockEdge];

/**
 * Where a `DockPanel` child sits: one of the four edges, or the remaining
 * space.
 *
 * @example
 * ```xml
 * <TrackList dock="fill" />
 * ```
 * @example
 * ```ts
 * const placement: DockPlacement = "fill";
 * ```
 */
export type DockPlacement = DockEdgeValue | "fill";

/**
 * One child of a `DockPanel` with the placement it resolved to.
 *
 * @example
 * ```xml
 * <DockPanel><Panel dock="top" height="56" /></DockPanel>
 * ```
 * @example
 * ```ts
 * const slot: DockSlot = { node: panel, edge: "top" };
 * ```
 */
export interface DockSlot {
  /** The child node. */
  readonly node: IRNode;
  /** The edge it peels off, or `fill` for the remaining space. */
  readonly edge: DockPlacement;
}

/**
 * The nesting a `DockPanel` renders as: each docked child wraps the rest of
 * the panel in a flex container, and the innermost slot holds the fill child.
 *
 * @example
 * ```xml
 * <DockPanel>
 *   <Panel dock="top" height="56" />
 *   <Panel dock="bottom" height="72" />
 *   <TrackList dock="fill" />
 * </DockPanel>
 * ```
 * @example
 * ```ts
 * const tree = planDockTree(dockPanel.children);
 * tree.kind; // "dock"
 * ```
 */
export type DockTree =
  | {
      /** Discriminator for the remaining space. */
      readonly kind: "fill";
      /** The child that fills it, when the panel has one. */
      readonly node: IRNode | undefined;
    }
  | {
      /** Discriminator for a docked child. */
      readonly kind: "dock";
      /** The edge the child peels off. */
      readonly edge: DockEdgeValue;
      /** The docked child. */
      readonly node: IRNode;
      /** The area left after peeling the edge off. */
      readonly rest: DockTree;
    };

/**
 * Resolves the placement of every `DockPanel` child in document order. The
 * first child marked `dock="fill"` takes the remaining space; with none
 * marked, the last child does. A child with no `dock` attribute peels off the
 * top edge.
 *
 * @example
 * ```xml
 * <DockPanel>
 *   <Panel dock="top" height="56" />
 *   <PageHost dock="fill" />
 * </DockPanel>
 * ```
 * @example
 * ```ts
 * planDock(dockPanel.children).map((slot) => slot.edge); // ["top", "fill"]
 * ```
 */
export function planDock(children: readonly IRNode[]): DockSlot[] {
  if (children.length === 0) return [];
  const marked = children.findIndex(
    (child) => attrString(child, "dock") === "fill"
  );
  const fillIndex = marked >= 0 ? marked : children.length - 1;
  return children.map((node, index) => ({
    node,
    edge: index === fillIndex ? "fill" : edgeOf(node),
  }));
}

/**
 * The nesting a `DockPanel` renders as, built from {@link planDock}. The
 * first docked child is the outermost container, so the document order of
 * the children is the order the edges are peeled off.
 *
 * @example
 * ```xml
 * <DockPanel>
 *   <Panel dock="top" height="56" />
 *   <Panel dock="start" width="220" />
 *   <PageHost dock="fill" />
 * </DockPanel>
 * ```
 * @example
 * ```ts
 * const tree = planDockTree(dockPanel.children);
 * tree.kind === "dock" ? tree.edge : undefined; // "top"
 * ```
 */
export function planDockTree(children: readonly IRNode[]): DockTree {
  const slots = planDock(children);
  let tree: DockTree = {
    kind: "fill",
    node: slots.find((slot) => slot.edge === "fill")?.node,
  };
  for (let index = slots.length - 1; index >= 0; index -= 1) {
    const slot = slots[index];
    if (slot.edge === "fill") continue;
    tree = { kind: "dock", edge: slot.edge, node: slot.node, rest: tree };
  }
  return tree;
}

/** The edge a docked child peels off. */
function edgeOf(node: IRNode): DockEdgeValue {
  const dock = attrString(node, "dock");
  if (dock === "bottom" || dock === "start" || dock === "end") return dock;
  return DockEdge.Top;
}
