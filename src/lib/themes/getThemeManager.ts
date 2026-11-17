import { getThemeStore } from "@/core/ports";
import { WMM_VERSION } from "@/core/system/types";
import { ThemeManager, activeTheme } from "@/core/themes";

let manager: ThemeManager | null = null;

/**
 * The app's single ThemeManager, bound to the registered theme store port and
 * the running app version. Components go through the TanStack Query hooks in
 * `@/hooks/useThemes`, which call this.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const themes = await getThemeManager().listThemes();
 * ```
 */
export function getThemeManager(): ThemeManager {
  if (!manager) {
    manager = new ThemeManager({
      store: getThemeStore(),
      appVersion: WMM_VERSION,
    });
  }

  return manager;
}

/**
 * Reloads the active theme store from the manager, so the provider re-applies
 * the tokens after an apply, a reset, a removal or a trial revert.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * await reloadActiveTheme();
 * activeTheme.getSnapshot().theme?.id; // "classic-blue"
 * ```
 */
export async function reloadActiveTheme(): Promise<void> {
  await activeTheme.load(() =>
    getThemeManager().getActiveTheme(window.location.search)
  );
}
