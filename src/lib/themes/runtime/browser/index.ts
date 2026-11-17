/**
 * Browser bindings of the theme token runtime: the root token applier, the
 * color scheme class, the font loader and the boot-time mirror.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * applyThemeMirrorAtBoot();
 * getRootTokenApplier().apply(tokens);
 * ```
 *
 * @module
 */
export {
  ThemeTokenApplier,
  applyColorSchemeClass,
  getRootTokenApplier,
} from "./applyThemeTokens";
export { applyThemeMirrorAtBoot } from "./bootThemeMirror";
export { ThemeFontLoader } from "./themeFontLoader";
