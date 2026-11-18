/**
 * Public theme API: install, list, apply and uninstall theme packages.
 * Lower-level parsing, validation and compilation live in `@/lib/themes`.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * import { ThemeManager } from "@/core/themes";
 * const manager = new ThemeManager({ store: getThemeStore() });
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
export type { ThemeIssue } from "@/lib/themes/issues";
