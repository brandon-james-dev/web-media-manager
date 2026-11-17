/**
 * The theme token runtime: palette slots to CSS custom properties, the root
 * font family, and the localStorage mirror that themes the first paint.
 *
 * @example
 * ```xml
 * <Palette scheme="dark">
 *   <Set slot="background" value="#0b1a3a" />
 * </Palette>
 * ```
 * @example
 * ```ts
 * const tokens = buildThemeTokens(ir, { scheme: "dark" });
 * const mirror = createThemeMirror(ir);
 * ```
 *
 * @module
 */
export {
  PALETTE_VARIABLES,
  THEME_FONT_FALLBACKS,
  buildThemeTokens,
  resolveColorScheme,
  themeFontFaces,
  themeFontFamilyName,
} from "./buildThemeTokens";
export type {
  BuildThemeTokensOptions,
  ThemeFontFaceEntry,
  ThemeTokens,
} from "./buildThemeTokens";
export {
  THEME_MIRROR_KEY,
  createThemeMirror,
  mirrorTokens,
  readThemeMirror,
  writeThemeMirror,
} from "./themeMirror";
export type { MirrorStorage, ThemeMirror } from "./themeMirror";
