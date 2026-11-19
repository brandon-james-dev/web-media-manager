import type { PackageFileStore } from "@/core/ports/packageFiles";
import type {
  InstalledTheme,
  PackageFileRecordInput,
  ThemeStore,
} from "@/core/ports/themes";
import { mimeTypeOf } from "@/lib/packages";
import { DexiePackageFileStore } from "./DexiePackageFileStore";
import { getWmmMusicDb } from "./WmmMusicDb";

const ACTIVE_THEME_KEY = "activeThemeId";

/**
 * Dexie-backed {@link ThemeStore}: one `themes` row per theme, its bytes in
 * `themeFiles`, and the active theme id in `themeSettings`.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const store = new DexieThemeStore();
 * await store.putTheme(theme, [{ path: "theme.xml", bytes }]);
 * ```
 */
export class DexieThemeStore implements ThemeStore {
  private readonly db = getWmmMusicDb();
  readonly files: PackageFileStore = new DexiePackageFileStore(
    this.db.themeFiles
  );

  async listThemes(): Promise<InstalledTheme[]> {
    return this.db.themes.toArray();
  }

  async getTheme(id: string): Promise<InstalledTheme | undefined> {
    return this.db.themes.get(id);
  }

  async putTheme(
    theme: InstalledTheme,
    files: PackageFileRecordInput[]
  ): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.themes,
      this.db.themeFiles,
      async () => {
        await this.files.deleteFiles(theme.id);
        await this.files.putFiles(
          files.map((file) => ({
            ownerId: theme.id,
            path: file.path,
            bytes: file.bytes,
            size: file.bytes.byteLength,
            mimeType: mimeTypeOf(file.path),
          }))
        );
        await this.db.themes.put(theme);
      }
    );
  }

  async deleteTheme(id: string): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.themes,
      this.db.themeFiles,
      this.db.themeSettings,
      async () => {
        await this.files.deleteFiles(id);
        await this.db.themes.delete(id);
        const active = await this.db.themeSettings.get(ACTIVE_THEME_KEY);
        if (active?.value === id) {
          await this.db.themeSettings.delete(ACTIVE_THEME_KEY);
        }
      }
    );
  }

  async getActiveThemeId(): Promise<string | undefined> {
    return (await this.db.themeSettings.get(ACTIVE_THEME_KEY))?.value;
  }

  async setActiveThemeId(id: string | undefined): Promise<void> {
    if (id === undefined) {
      await this.db.themeSettings.delete(ACTIVE_THEME_KEY);
      return;
    }
    await this.db.themeSettings.put({ key: ACTIVE_THEME_KEY, value: id });
  }
}
