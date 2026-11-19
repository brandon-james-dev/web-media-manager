import { getElementDef } from "@/lib/themes/componentModel";
import type { Size } from "@/lib/themes/componentModel/types";
import type { IRNode } from "@/lib/themes/ir";
import { resolveWidgetMinSize } from "@/lib/themes/render/layout/widgetSize";

/**
 * The minimum size a layout node's element declares for it. A definition
 * with a single box returns it as is; one that declares a box per variant
 * value picks the entry the node's `minSizeBy` attribute names. A node whose
 * variant is unset, or names an entry the definition does not declare, has
 * no floor.
 *
 * @example
 * ```xml
 * <SeekBar variant="edge" slider="@slider/seek" />
 * ```
 * @example
 * ```ts
 * const min = getWidgetMinSize(edgeNode); // { width: 80, height: 2 }
 * const floor = getWidgetMinSize(backdropNode); // undefined
 * ```
 */
export function getWidgetMinSize(node: IRNode): Size | undefined {
  return resolveWidgetMinSize(getElementDef(node.element), node);
}
