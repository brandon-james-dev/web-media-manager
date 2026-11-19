/**
 * Public theme API: install, list, apply and uninstall theme packages, plus
 * the building blocks a themed component reads a layout node with. Lower-level
 * parsing, validation and compilation live in `@/lib/themes`.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * import { ThemeManager, attrString, getWidgetMinSize } from "@/core/themes";
 * const manager = new ThemeManager({ store: getThemeStore() });
 * const variant = attrString(node, "variant");
 * const min = getWidgetMinSize(node);
 * ```
 */
export {
  SAFE_MODE_QUERY,
  ThemeInstallChange,
  ThemeManager,
  isSafeMode,
} from "./ThemeManager";
export type {
  PendingThemeInstall,
  ThemeInstallResult,
  ThemeManagerOptions,
  ThemeReviewResult,
} from "./ThemeManager";
export { ActiveTheme, activeTheme } from "./activeTheme";
export type { ActiveThemeSnapshot } from "./activeTheme";
export {
  THEME_TRIAL_SECONDS,
  ThemeTrial,
  shouldStartThemeTrial,
  themeTrial,
} from "./themeTrial";
export type {
  ThemeTrialRevert,
  ThemeTrialState,
  ThemeTrialTimers,
} from "./themeTrial";
export {
  THEME_CRASH_STORAGE_KEY,
  THEME_CRASH_WINDOW_MS,
  ThemeCrashGuard,
  themeCrashGuard,
} from "./themeCrashGuard";
export type { ThemeCrashStorage } from "./themeCrashGuard";
export {
  getThemeNavigationHandler,
  setThemeNavigationHandler,
} from "./themeNavigation";
export type { ThemeNavigationHandler } from "./themeNavigation";
export type { InstalledTheme } from "@/core/ports/themes";
export {
  attrBool,
  attrList,
  attrRef,
  attrString,
  readAttr,
} from "@/lib/themes/render/layout/attributes";
export { derivePalette } from "@/lib/themes/ir";
export type { IRNode, IRValue } from "@/lib/themes/ir";
export { IssueSeverity } from "@/lib/themes/issues";
export type { ThemeIssue } from "@/lib/themes/issues";
export type { ColorScheme } from "@/lib/themes/package";
export { getWidgetMinSize } from "./widgetMinSize";
