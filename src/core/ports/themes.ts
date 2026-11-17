import type { ThemeIR } from "@/lib/themes/ir";
import type { ThemeManifest } from "@/lib/themes/package";
import type { PackageFileStore } from "./packageFiles";

/**
 * One installed theme: its validated manifest and compiled IR. File bytes
 * live in the theme {@link PackageFileStore}, keyed by `id`.
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.0", "id": "classic-blue", "version": "1.2.0" }
 * ```
 * @example
 * ```ts
 * const theme: InstalledTheme = {
 *   id: manifest.id,
 *   name: manifest.name,
 *   version: manifest.version,
 *   manifest,
 *   ir,
 *   installedAt: Date.now(),
 * };
 * ```
 */
export interface InstalledTheme {
  id: string;
  name: string;
  version: string;
  manifest: ThemeManifest;
  ir: ThemeIR;
  installedAt: number;
}

/**
 * Theme store port. The theme manager owns install, validation and apply
 * logic; this port owns persistence. The browser binding is Dexie
 * (`themes`, `themeFiles`, `themeSettings`).
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const store = getThemeStore();
 * await store.putTheme(theme);
 * await store.setActiveThemeId(theme.id);
 * ```
 */
export interface ThemeStore {
  readonly files: PackageFileStore;
  listThemes(): Promise<InstalledTheme[]>;
  getTheme(id: string): Promise<InstalledTheme | undefined>;
  putTheme(
    theme: InstalledTheme,
    files: PackageFileRecordInput[]
  ): Promise<void>;
  deleteTheme(id: string): Promise<void>;
  getActiveThemeId(): Promise<string | undefined>;
  setActiveThemeId(id: string | undefined): Promise<void>;
}

/**
 * A file to store with a theme, before the store assigns its key and owner.
 *
 * @example
 * ```xml
 * <Image id="logo" src="assets/images/logo.png" />
 * ```
 * @example
 * ```ts
 * const input: PackageFileRecordInput = { path: "theme.xml", bytes };
 * ```
 */
export interface PackageFileRecordInput {
  path: string;
  bytes: Uint8Array;
}

let themeStoreProvider: (() => ThemeStore) | null = null;

/**
 * Registers the platform's theme store provider during bootstrap.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * setThemeStoreProvider(() => new DexieThemeStore());
 * ```
 */
export function setThemeStoreProvider(provider: () => ThemeStore): void {
  themeStoreProvider = provider;
}

/**
 * Returns the registered theme store.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const themes = await getThemeStore().listThemes();
 * ```
 */
export function getThemeStore(): ThemeStore {
  if (!themeStoreProvider) {
    throw new Error(
      "[core/ports/themes] No theme store provider registered — call setThemeStoreProvider() during bootstrap."
    );
  }
  return themeStoreProvider();
}
