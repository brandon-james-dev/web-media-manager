/**
 * The theme layout renderer's pure core: attribute defaults, layout styles,
 * dock planning, layout analysis, command payloads, button state, icons and
 * the navigation store. Everything here is framework-free, so it runs in a
 * node test and in any host.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop">
 *   <Shell><PageHost /></Shell>
 * </Layout>
 * ```
 * @example
 * ```ts
 * const analysis = analyzeLayout(layout);
 * const state = new ThemeLayoutState({ themeId, formFactor, pages: analysis.pages });
 * ```
 *
 * @module
 */
export {
  attrBool,
  attrList,
  attrNumber,
  attrRef,
  attrString,
  elementCategory,
  isWidget,
  readAttr,
} from "./attributes";
export { resolveWidgetMinSize } from "./widgetSize";
export {
  commonStyle,
  FILL_PLACEMENT,
  gridItemStyle,
  gridStyle,
  isVisible,
  stackItemStyle,
  stackStyle,
} from "./layoutStyle";
export { DockEdge, planDock, planDockTree } from "./planDock";
export type {
  DockEdgeValue,
  DockPlacement,
  DockSlot,
  DockTree,
} from "./planDock";
export { analyzeLayout } from "./layoutAnalysis";
export type { LayoutAnalysis, LayoutPage } from "./layoutAnalysis";
export { buildCommandPayload } from "./commandPayload";
export type {
  CommandPayloadResult,
  ThemeCommandPayload,
} from "./commandPayload";
export { computeButtonState, isToggleCommand } from "./buttonState";
export type { ButtonState, ButtonStateSnapshot } from "./buttonState";
export { ICON_SWAPS, resolveThemeIcon, THEME_ICONS } from "./themeIcons";
export type { IconSwap } from "./themeIcons";
export { selectThemedLayout } from "./selectThemedLayout";
export type { ThemedLayoutSelection } from "./selectThemedLayout";
export { ThemeLayoutState } from "./themeLayoutState";
export type {
  ThemeLayoutPageRef,
  ThemeLayoutSnapshot,
  ThemeLayoutStateOptions,
  ThemeLayoutStorage,
} from "./themeLayoutState";
