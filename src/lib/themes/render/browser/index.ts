/**
 * Browser bindings of the theme render layer: the adopted stylesheet host and
 * the image asset manager that creates the Blob URLs the stylesheet points at.
 *
 * @example
 * ```xml
 * <Image id="play-orb" src="assets/images/play-orb.png" />
 * ```
 * @example
 * ```ts
 * const images = await new ThemeImageAssets(readFile).preload(ir);
 * getThemeStyleSheetHost().apply(sheet.cssText);
 * ```
 *
 * @module
 */
export { ThemeImageAssets } from "../assets/browser/themeImageAssets";
export { useFormFactor } from "../formFactor/browser/useFormFactor";
export {
  ThemeStyleSheetHost,
  getThemeStyleSheetHost,
} from "../styles/browser/themeStyleSheetHost";
export {
  elementRegistry,
  registerThemeWidgets,
} from "../layout/browser/elementRegistry";
export type {
  ElementComponent,
  ElementProps,
} from "../layout/browser/elementProps";
export { RenderNode } from "../layout/browser/renderNode";
export type { RenderNodeProps } from "../layout/browser/renderNode";
export {
  ThemeRenderProvider,
  useThemeLayoutSnapshot,
  useThemeRender,
} from "../layout/browser/ThemeRenderContext";
export type { ThemeRenderContextValue } from "../layout/browser/ThemeRenderContext";
export { ThemedLayout } from "../layout/browser/ThemedLayout";
export type { ThemedLayoutProps } from "../layout/browser/ThemedLayout";
export { ThemeRenderBoundary } from "../layout/browser/ThemeRenderBoundary";
export type { ThemeRenderBoundaryProps } from "../layout/browser/ThemeRenderBoundary";
export { ThemedShellRoute } from "../layout/browser/ThemedShellRoute";
export { useThemedLayoutSelection } from "../layout/browser/useThemedLayoutSelection";
export { useThemedLayoutPending } from "../layout/browser/useThemedLayoutPending";
export { useButtonState } from "../layout/browser/useButtonState";
export {
  TabStripButtonClassContext,
  TabStripStartContext,
  useTabStripButtonClass,
  useTabStripStart,
} from "../layout/browser/tabStripSlot";
export { useThemeStylesheet } from "../layout/browser/useThemeStylesheet";
export type { ThemeStylesheetResult } from "../layout/browser/useThemeStylesheet";
