import { COMMON_ATTRIBUTES } from "../commonAttributes";
import { LAYOUT_LIST, THEME_SPEC_VERSION } from "../constants";
import { ElementCategory } from "../elementCategory";
import type { ElementDef } from "../types";

/**
 * Docks children to its edges in document order and gives the remaining
 * space to the `fill` child. At most one child fills; with none marked,
 * the last child fills. `start` and `end` follow reading direction.
 *
 * @example
 * ```xml
 * <DockPanel>
 *   <Panel dock="top" height="56" />
 *   <Panel dock="start" width="220" />
 *   <TrackList dock="fill" />
 * </DockPanel>
 * ```
 * @example
 * ```ts
 * const fills = node.children.filter(
 *   (child) => child.attributes.dock === "fill"
 * );
 * const fillChild = fills[0] ?? node.children.at(-1);
 * ```
 *
 * @see [DockPanel](../../render/layout/browser/elements/DockPanel.tsx)
 */
export const DOCK_PANEL_ELEMENT: ElementDef = {
  name: "DockPanel",
  category: ElementCategory.Primitive,
  attributes: { ...COMMON_ATTRIBUTES },
  children: LAYOUT_LIST,
  since: THEME_SPEC_VERSION,
};
