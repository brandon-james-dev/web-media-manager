/**
 * The compiled theme IR, palette derivation and the compiler that turns a
 * validated package into it.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="@color/navy-900" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const { ir } = compileTheme({ manifest, theme, layouts });
 * const slots = derivePalette(ir!.palettes.dark!);
 * ```
 */
export { compileTheme } from "./compileTheme";
export type { CompileThemeInput, CompileThemeResult } from "./compileTheme";
export { derivePalette } from "./derivePalette";
export { THEME_IR_VERSION, normalizeHexColor } from "./themeIr";
export type {
  IRBrush,
  IRBrushValue,
  IRColor,
  IRColorLiteral,
  IRColorSlot,
  IRDefaults,
  IRFont,
  IRFontFace,
  IRGradientStop,
  IRGridTrack,
  IRImage,
  IRImageBrush,
  IRImageVariant,
  IRLinearBrush,
  IRNode,
  IRRef,
  IRShadowLayer,
  IRSolidBrush,
  IRStyle,
  IRStyleState,
  IRValue,
  ThemeIR,
} from "./themeIr";
