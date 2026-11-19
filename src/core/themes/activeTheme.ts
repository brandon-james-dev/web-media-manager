import type { InstalledTheme } from "@/core/ports";

/**
 * What the app knows about the active theme: whether the first load has
 * finished, and the theme itself (`undefined` for the built-in theme or safe
 * mode).
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * const snapshot: ActiveThemeSnapshot = { loaded: true, theme: undefined };
 * ```
 */
export interface ActiveThemeSnapshot {
  loaded: boolean;
  theme: InstalledTheme | undefined;
}

const INITIAL: ActiveThemeSnapshot = { loaded: false, theme: undefined };

/**
 * The active theme as a framework-free external store. The provider
 * subscribes with `useSyncExternalStore` and the theme hooks reload it after
 * every change, so a switch updates the DOM without a reload.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * await activeTheme.load(() => manager.getActiveTheme(window.location.search));
 * activeTheme.getSnapshot().theme?.id; // "classic-blue"
 * ```
 */
export class ActiveTheme {
  private readonly listeners = new Set<() => void>();
  private snapshot: ActiveThemeSnapshot = INITIAL;
  private sequence = 0;

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): ActiveThemeSnapshot => this.snapshot;

  /**
   * Loads the active theme through `loader`. The latest call wins, a
   * rejection becomes "loaded, no theme", and a reload that resolves to the
   * same id, version and install time does not notify.
   *
   * @example
   * ```xml
   * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
   * ```
   * @example
   * ```ts
   * await activeTheme.load(() => getThemeManager().getActiveTheme(""));
   * ```
   */
  async load(loader: () => Promise<InstalledTheme | undefined>): Promise<void> {
    const sequence = this.sequence + 1;
    this.sequence = sequence;

    let theme: InstalledTheme | undefined;
    try {
      theme = await loader();
    } catch (error) {
      console.warn("[themes] Could not load the active theme:", error);
      theme = undefined;
    }

    if (sequence !== this.sequence) return;

    const current = this.snapshot.theme;
    if (
      this.snapshot.loaded &&
      current?.id === theme?.id &&
      current?.version === theme?.version &&
      current?.installedAt === theme?.installedAt
    ) {
      return;
    }

    this.update({ loaded: true, theme });
  }

  private update(snapshot: ActiveThemeSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}

/**
 * The app-wide active theme store.
 *
 * @example
 * ```xml
 * <Theme xmlns="urn:wmm:theme:1" spec="1.0" />
 * ```
 * @example
 * ```ts
 * useSyncExternalStore(activeTheme.subscribe, activeTheme.getSnapshot);
 * ```
 */
export const activeTheme = new ActiveTheme();
