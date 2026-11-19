import { setThemeStoreProvider } from "@/core/ports";
import { DexieThemeStore } from "../dexie/DexieThemeStore";

/**
 * Browser binding for the theme store port. Called during app bootstrap,
 * before anything loads or installs a theme.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * registerBrowserThemeStoreProvider();
 * ```
 */
export function registerBrowserThemeStoreProvider(): void {
  setThemeStoreProvider(() => new DexieThemeStore());
}
