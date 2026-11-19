/**
 * Widget kit: the building blocks a widget's `definition.ts` may use to
 * describe its element. It exposes the `defineWidget` command, the value
 * types, child rules and the `ElementDef` shape, and nothing else.
 *
 * It never imports the element tables (`LAYOUT_ELEMENTS`, `THEME_ELEMENTS`,
 * `getElementDef`) or the theme API barrel, so a definition can be imported
 * by the validator without an import cycle and without loading app code.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist album duration" />
 * ```
 * @example
 * ```ts
 * import { ValueType, defineWidget } from "@/core/themes/widgetKit";
 *
 * export const TRACK_LIST_ELEMENT = defineWidget({
 *   name: "TrackList",
 *   attributes: { variant: { type: ValueType.Enum, values: ["table"] } },
 *   perPage: 1,
 * });
 * ```
 *
 * @module
 */
export { defineWidget } from "./defineWidget";
export type { WidgetSpec } from "./defineWidget";
export {
  DISPLAY_VALUES,
  NO_CHILDREN,
} from "@/lib/themes/componentModel/constants";
export { ReferenceKind } from "@/lib/themes/componentModel/referenceKind";
export { TRACK_COLUMN_VALUES } from "@/lib/themes/componentModel/trackColumnValues";
export type {
  AttributeDef,
  ChildRule,
  ElementDef,
  Size,
} from "@/lib/themes/componentModel/types";
export { ValueType } from "@/lib/themes/componentModel/valueType";
