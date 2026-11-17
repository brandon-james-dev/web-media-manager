import { LAYOUT_ELEMENTS } from "./layoutElements";
import type { ElementDef } from "./types";

/**
 * Looks up the definition of a layout XML element by its exact,
 * case-sensitive name. Returns `undefined` for an unknown element, which the
 * validator reports as an error.
 *
 * @example
 * ```xml
 * <TrackList variant="table" sortBy="artist" />
 * ```
 * @example
 * ```ts
 * const def = getElementDef(element.name);
 * if (def === undefined) {
 *   reportUnknownElement(element);
 * } else if (!(attributeName in def.attributes)) {
 *   reportUnknownAttribute(element, attributeName);
 * }
 * ```
 */
export function getElementDef(name: string): ElementDef | undefined {
  return LAYOUT_ELEMENTS[name];
}
