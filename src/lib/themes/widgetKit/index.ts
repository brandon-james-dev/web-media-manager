/**
 * Widget kit: the building blocks a widget's `definition.ts` may use to
 * describe its element. It exposes the shared attributes, value types, child
 * rules and the `ElementDef` shape, and nothing else.
 *
 * It never imports the element tables (`LAYOUT_ELEMENTS`, `THEME_ELEMENTS`,
 * `getElementDef`), so a definition can be imported by the validator without
 * an import cycle and without loading app code.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist album duration" />
 * ```
 * @example
 * ```ts
 * import { COMMON_ATTRIBUTES, ValueType } from "@/lib/themes/widgetKit";
 * import type { ElementDef } from "@/lib/themes/widgetKit";
 *
 * const def: ElementDef = {
 *   attributes: { ...COMMON_ATTRIBUTES, variant: { type: ValueType.String } },
 * };
 * ```
 *
 * @module
 */
export { COMMON_ATTRIBUTES } from "../componentModel/commonAttributes";
export { WIDGET_ATTRIBUTES } from "../componentModel/widgetAttributes";
export {
  DISPLAY_VALUES,
  NO_CHILDREN,
  THEME_SPEC_VERSION,
} from "../componentModel/constants";
export { ElementCategory } from "../componentModel/elementCategory";
export { ReferenceKind } from "../componentModel/referenceKind";
export { ValueType } from "../componentModel/valueType";
export { TRACK_COLUMN_VALUES } from "../componentModel/trackColumnValues";
export type {
  AttributeDef,
  ChildRule,
  ElementDef,
  Size,
} from "../componentModel/types";
