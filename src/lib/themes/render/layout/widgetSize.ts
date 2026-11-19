import type { ElementDef, Size } from "../../componentModel";
import type { IRNode } from "../../ir";
import { attrString } from "./attributes";

/**
 * The minimum size an element definition declares for one node. A definition
 * with a single box returns it as is; one that declares a box per variant
 * value picks the entry the node's `minSizeBy` attribute names. A node whose
 * variant is unset, or names an entry the definition does not declare, has no
 * floor.
 *
 * @example
 * ```xml
 * <SeekBar variant="edge" slider="@slider/seek" />
 * ```
 * @example
 * ```ts
 * resolveWidgetMinSize(getElementDef("SeekBar"), edgeNode); // { width: 80, height: 2 }
 * resolveWidgetMinSize(getElementDef("Backdrop"), backdropNode); // undefined
 * ```
 */
export function resolveWidgetMinSize(
  def: ElementDef | undefined,
  node: IRNode
): Size | undefined {
  const minSize = def?.minSize;
  if (minSize === undefined) return undefined;
  if (isSize(minSize)) return minSize;
  const key =
    def?.minSizeBy === undefined ? undefined : attrString(node, def.minSizeBy);
  return key === undefined ? undefined : minSize[key];
}

/** Whether a minimum size is one box rather than one per variant value. */
function isSize(value: Size | Readonly<Record<string, Size>>): value is Size {
  return typeof (value as Size).width === "number";
}
