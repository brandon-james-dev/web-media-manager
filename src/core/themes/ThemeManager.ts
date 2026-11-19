import type { InstalledTheme, ThemeStore } from "@/core/ports/themes";
import { compareVersions } from "@/lib/packages";
import { IssueSeverity } from "@/lib/themes/issues";
import type { ThemeIssue } from "@/lib/themes/issues";
import type { ThemeIR } from "@/lib/themes/ir";
import type { ThemeManifest } from "@/lib/themes/package";
import { validateThemePackage } from "@/lib/themes/pipeline";

/**
 * The URL query that starts the app on the built-in theme without loading
 * the stored one.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * isSafeMode("?theme=default"); // true
 * ```
 */
export const SAFE_MODE_QUERY = { name: "theme", value: "default" } as const;

/**
 * Returns whether a URL search string asks for the built-in theme.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * isSafeMode(window.location.search);
 * ```
 */
export function isSafeMode(search: string): boolean {
  return (
    new URLSearchParams(search).get(SAFE_MODE_QUERY.name) ===
    SAFE_MODE_QUERY.value
  );
}

/**
 * Options for {@link ThemeManager}.
 *
 * @example
 * ```json
 * { "app": { "min": "0.9.0" } }
 * ```
 * @example
 * ```ts
 * new ThemeManager({ store: getThemeStore(), appVersion: WMM_VERSION });
 * ```
 */
export interface ThemeManagerOptions {
  store: ThemeStore;
  appVersion?: string;
  now?: () => number;
}

/**
 * The outcome of {@link ThemeManager.installTheme}. `theme` is set only when
 * the package had no errors and was stored.
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.1" }
 * ```
 * @example
 * ```ts
 * const { theme, issues } = await manager.installTheme(zipBytes);
 * ```
 */
export interface ThemeInstallResult {
  theme?: InstalledTheme;
  issues: ThemeIssue[];
}

/**
 * How a reviewed package relates to an installed theme with the same id.
 *
 * @example
 * ```json
 * { "id": "classic-blue", "version": "1.3.0" }
 * ```
 * @example
 * ```ts
 * if (pending.change === ThemeInstallChange.Downgrade) confirmDowngrade();
 * ```
 */
export const ThemeInstallChange = {
  /**
   * No theme with this id is installed.
   *
   * @example
   * ```json
   * { "id": "classic-blue" }
   * ```
   * @example
   * ```ts
   * ThemeInstallChange.New; // "new"
   * ```
   */
  New: "new",
  /**
   * The package has a higher version than the installed theme.
   *
   * @example
   * ```json
   * { "version": "1.3.0" }
   * ```
   * @example
   * ```ts
   * ThemeInstallChange.Update; // "update"
   * ```
   */
  Update: "update",
  /**
   * The package has the same version as the installed theme.
   *
   * @example
   * ```json
   * { "version": "1.2.0" }
   * ```
   * @example
   * ```ts
   * ThemeInstallChange.Reinstall; // "reinstall"
   * ```
   */
  Reinstall: "reinstall",
  /**
   * The package has a lower version and needs explicit confirmation.
   *
   * @example
   * ```json
   * { "version": "1.1.0" }
   * ```
   * @example
   * ```ts
   * ThemeInstallChange.Downgrade; // "downgrade"
   * ```
   */
  Downgrade: "downgrade",
} as const;

export type ThemeInstallChange =
  (typeof ThemeInstallChange)[keyof typeof ThemeInstallChange];

/**
 * A validated package waiting for the user to confirm the review dialog.
 *
 * @example
 * ```json
 * { "id": "classic-blue", "version": "1.3.0" }
 * ```
 * @example
 * ```ts
 * const theme = await manager.commitInstall(pending);
 * ```
 */
export interface PendingThemeInstall {
  manifest: ThemeManifest;
  files: Map<string, Uint8Array>;
  ir: ThemeIR;
  change: ThemeInstallChange;
  existing?: InstalledTheme;
}

/**
 * The outcome of {@link ThemeManager.reviewTheme}. `pending` is set only
 * when the package had no errors; nothing is stored yet.
 *
 * @example
 * ```json
 * { "kind": "theme", "spec": "1.0" }
 * ```
 * @example
 * ```ts
 * const { pending, issues } = await manager.reviewTheme(zipBytes);
 * ```
 */
export interface ThemeReviewResult {
  pending?: PendingThemeInstall;
  issues: ThemeIssue[];
}

/**
 * The public theme API: install, list, apply and uninstall theme packages.
 * `undefined` as the active theme means the built-in default.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const manager = new ThemeManager({ store: getThemeStore() });
 * const { theme } = await manager.installTheme(await file.arrayBuffer());
 * if (theme) await manager.applyTheme(theme.id);
 * ```
 */
export class ThemeManager {
  private readonly store: ThemeStore;
  private readonly appVersion: string | undefined;
  private readonly now: () => number;

  constructor(options: ThemeManagerOptions) {
    this.store = options.store;
    this.appVersion = options.appVersion;
    this.now = options.now ?? Date.now;
  }

  async reviewTheme(
    input: ArrayBuffer | Uint8Array
  ): Promise<ThemeReviewResult> {
    const result = validateThemePackage(input, {
      appVersion: this.appVersion,
    });
    const failed = result.issues.some(
      (issue) => issue.severity === IssueSeverity.Error
    );
    if (
      failed ||
      result.manifest === undefined ||
      result.files === undefined ||
      result.ir === undefined
    ) {
      return { issues: result.issues };
    }
    const existing = await this.store.getTheme(result.manifest.id);
    const order =
      existing === undefined
        ? undefined
        : compareVersions(result.manifest.version, existing.version);
    const change: ThemeInstallChange =
      order === undefined
        ? ThemeInstallChange.New
        : order > 0
          ? ThemeInstallChange.Update
          : order === 0
            ? ThemeInstallChange.Reinstall
            : ThemeInstallChange.Downgrade;
    return {
      pending: {
        manifest: result.manifest,
        files: result.files,
        ir: result.ir,
        change,
        ...(existing === undefined ? {} : { existing }),
      },
      issues: result.issues,
    };
  }

  async commitInstall(pending: PendingThemeInstall): Promise<InstalledTheme> {
    const theme: InstalledTheme = {
      id: pending.manifest.id,
      name: pending.manifest.name,
      version: pending.manifest.version,
      manifest: pending.manifest,
      ir: pending.ir,
      installedAt: this.now(),
    };
    await this.store.putTheme(
      theme,
      [...pending.files].map(([path, bytes]) => ({ path, bytes }))
    );
    return theme;
  }

  async installTheme(
    input: ArrayBuffer | Uint8Array
  ): Promise<ThemeInstallResult> {
    const { pending, issues } = await this.reviewTheme(input);
    if (pending === undefined) return { issues };
    return { theme: await this.commitInstall(pending), issues };
  }

  async getActiveThemeId(): Promise<string | undefined> {
    return this.store.getActiveThemeId();
  }

  async setActiveThemeId(id: string | undefined): Promise<void> {
    if (id !== undefined && (await this.store.getTheme(id)) === undefined) {
      throw new Error(`Theme "${id}" is not installed.`);
    }
    await this.store.setActiveThemeId(id);
  }

  async listThemes(): Promise<InstalledTheme[]> {
    return this.store.listThemes();
  }

  async getActiveTheme(search = ""): Promise<InstalledTheme | undefined> {
    if (isSafeMode(search)) return undefined;
    const id = await this.store.getActiveThemeId();
    return id === undefined ? undefined : this.store.getTheme(id);
  }

  async applyTheme(id: string): Promise<InstalledTheme> {
    const theme = await this.store.getTheme(id);
    if (theme === undefined) {
      throw new Error(`Theme "${id}" is not installed.`);
    }
    await this.store.setActiveThemeId(id);
    return theme;
  }

  async resetToDefault(): Promise<void> {
    await this.store.setActiveThemeId(undefined);
  }

  async uninstallTheme(id: string): Promise<void> {
    await this.store.deleteTheme(id);
  }
}
