/**
 * Theme component model: the elements, attributes, value types and child
 * rules a theme layout may use. The parser, validator and compiler read it
 * instead of hard-coding element knowledge.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell>...</Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * import { getElementDef, ValueType } from "@/lib/themes/componentModel";
 *
 * const def = getElementDef("SeekBar");
 * const isBoolean = def?.attributes.buffering?.type === ValueType.Boolean;
 * ```
 *
 * @module
 */
export { THEME_NAMESPACE, THEME_SPEC_VERSION } from "./constants";
export { ValueType } from "./valueType";
export { ReferenceKind } from "./referenceKind";
export { ElementCategory } from "./elementCategory";
export { FormFactor } from "./formFactor";
export { LibraryMode } from "./libraryMode";
export { ICON_NAMES } from "./iconNames";
export { LAYOUT_ELEMENTS } from "./layoutElements";
export { THEME_ELEMENTS } from "./themeElements";
export { PALETTE_SLOTS, REQUIRED_PALETTE_SLOTS } from "./paletteSlots";
export { getElementDef } from "./getElementDef";
export type { IconName } from "./iconNames";
export type { PaletteSlot } from "./paletteSlots";
export type { Size, AttributeDef, ChildRule, ElementDef } from "./types";
