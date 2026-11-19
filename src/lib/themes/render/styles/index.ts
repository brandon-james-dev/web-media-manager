/**
 * The theme style engine: compiled IR styles and per-node inline overrides to
 * one CSS text with host-generated class names.
 *
 * @example
 * ```xml
 * <ButtonStyle id="transport" background="@brush/chrome-gloss">
 *   <State name="hover" background="@brush/chrome-gloss-hi" />
 * </ButtonStyle>
 * ```
 * @example
 * ```ts
 * const sheet = buildThemeStylesheet(ir, { formFactor: "desktop", images });
 * sheet.defaults.button; // "wmm-t-1x9f2a"
 * ```
 *
 * @module
 */
export { buildThemeStylesheet } from "./buildThemeStylesheet";
export {
  cssImage,
  escapeUrl,
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeLength,
  serializeShadow,
  serializeTextStyle,
  serializeThickness,
} from "./serializeValues";
export { themeClassName } from "./styleClassNames";
export type {
  BuildThemeStylesheetOptions,
  ResolvedThemeImage,
  ThemeImageResolver,
  ThemeStyleClasses,
  ThemeStyleDefaults,
  ThemeStylesheet,
} from "./types";
