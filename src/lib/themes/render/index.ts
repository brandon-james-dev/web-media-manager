/**
 * The theme render layer: the style engine that turns compiled IR styles into
 * one CSS text, and the ref-counted URL cache its images use.
 *
 * @example
 * ```xml
 * <PanelStyle id="inset" background="@slot/card" cornerRadius="4" />
 * ```
 * @example
 * ```ts
 * const sheet = buildThemeStylesheet(ir, { formFactor: "desktop", images });
 * sheet.classes.panel.inset; // "wmm-t-0k3m9z"
 * ```
 *
 * @module
 */
export {
  buildThemeStylesheet,
  cssImage,
  escapeUrl,
  serializeBrush,
  serializeColor,
  serializeCornerRadius,
  serializeLength,
  serializeShadow,
  serializeTextStyle,
  serializeThickness,
  themeClassName,
} from "./styles";
export type {
  BuildThemeStylesheetOptions,
  ResolvedThemeImage,
  ThemeImageResolver,
  ThemeStyleClasses,
  ThemeStyleDefaults,
  ThemeStylesheet,
} from "./styles";
export { RefCountedUrlCache } from "./assets/refCountedUrlCache";
export { resolveFormFactor } from "./formFactor";
export type { FormFactorInputs } from "./formFactor";
export {
  analyzeLayout,
  attrBool,
  attrList,
  attrNumber,
  attrRef,
  attrString,
  buildCommandPayload,
  commonStyle,
  computeButtonState,
  DockEdge,
  elementCategory,
  FILL_PLACEMENT,
  gridItemStyle,
  gridStyle,
  ICON_SWAPS,
  isToggleCommand,
  isVisible,
  isWidget,
  planDock,
  planDockTree,
  readAttr,
  resolveThemeIcon,
  resolveWidgetMinSize,
  selectThemedLayout,
  stackItemStyle,
  stackStyle,
  THEME_ICONS,
  ThemeLayoutState,
} from "./layout";
export type {
  ButtonState,
  ButtonStateSnapshot,
  CommandPayloadResult,
  DockEdgeValue,
  DockPlacement,
  DockSlot,
  DockTree,
  IconSwap,
  LayoutAnalysis,
  LayoutPage,
  ThemeCommandPayload,
  ThemeLayoutPageRef,
  ThemeLayoutSnapshot,
  ThemeLayoutStateOptions,
  ThemeLayoutStorage,
  ThemedLayoutSelection,
} from "./layout";
