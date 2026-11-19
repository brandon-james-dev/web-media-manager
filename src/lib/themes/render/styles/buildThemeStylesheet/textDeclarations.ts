import type { IRValue, ThemeIR } from "../../../ir";
import { serializeTextStyle } from "../serializeValues";
import { referenceOf } from "./irValues";
import type { StyleContext } from "./styleContext";

/**
 * The declarations a text style passes on to descendants: the inheritable
 * ones only.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" textStyle="@text/body" />
 * ```
 * @example
 * ```ts
 * INHERITABLE_PROPERTIES.has("color"); // true
 * ```
 */
export const INHERITABLE_PROPERTIES = new Set([
  "color",
  "letter-spacing",
  "text-transform",
  "line-height",
]);

/** The text style context of a theme. */
export function textContext(ir: ThemeIR): {
  themeId: string;
  fonts: ThemeIR["fonts"];
  shadows: ThemeIR["shadows"];
} {
  return { themeId: ir.themeId, fonts: ir.fonts, shadows: ir.shadows };
}

/** The inheritable declarations of a text style reference. */
export function textStyleDeclarations(
  props: Record<string, IRValue>,
  ctx: StyleContext
): Record<string, string> {
  const ref = referenceOf(props.textStyle, "text");
  if (ref === undefined) return {};
  const style = ctx.ir.textStyles[ref.id];
  if (style === undefined) return {};
  const declarations = serializeTextStyle(style, textContext(ctx.ir));
  const inheritable: Record<string, string> = {};
  for (const [name, value] of Object.entries(declarations)) {
    if (name.startsWith("font-") || INHERITABLE_PROPERTIES.has(name)) {
      inheritable[name] = value;
    }
  }
  return inheritable;
}
