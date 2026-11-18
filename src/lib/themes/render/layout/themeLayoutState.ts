import type { FormFactor } from "../../componentModel";

/**
 * The page facts the layout state needs: its id and whether it covers the
 * Shell. A compiled {@link LayoutPage} satisfies it.
 *
 * @example
 * ```xml
 * <Page id="library" role="library" titleKey="navigation.library" />
 * ```
 * @example
 * ```ts
 * const page: ThemeLayoutPageRef = { id: "library", overlay: false };
 * ```
 */
export interface ThemeLayoutPageRef {
  /** The page id, which is also the `wmm.ui.navigate` parameter. */
  readonly id: string;
  /** Whether the page covers the Shell instead of rendering in the host. */
  readonly overlay: boolean;
}

/**
 * The observable state of one mounted layout: the page it shows, the page it
 * came from, whether an overlay page is open, whether the document is in full
 * screen, whether the library is in edit mode, the open collapsible panels and
 * the selected tab of each `Tabs` element.
 *
 * @example
 * ```xml
 * <Page id="now-playing" role="nowPlaying" presentation="overlay" />
 * ```
 * @example
 * ```ts
 * const snapshot: ThemeLayoutSnapshot = {
 *   currentPage: "library",
 *   previousPage: "playlists",
 *   overlayOpen: true,
 *   fullscreen: false,
 *   editMode: false,
 *   openPanels: new Set(["sidebar"]),
 *   selectedTabs: { queue: "lyrics" },
 * };
 * ```
 */
export interface ThemeLayoutSnapshot {
  /** The page rendered in the `PageHost`. */
  readonly currentPage: string;
  /** The page shown before the current one, when there was one. */
  readonly previousPage: string | undefined;
  /** Whether an overlay page is covering the Shell. */
  readonly overlayOpen: boolean;
  /** Whether the document is in full screen. */
  readonly fullscreen: boolean;
  /** Whether the library is in edit mode. */
  readonly editMode: boolean;
  /** The collapsible panels that are open. */
  readonly openPanels: ReadonlySet<string>;
  /** The selected tab id per `Tabs` element id. */
  readonly selectedTabs: Readonly<Record<string, string>>;
}

/**
 * Where the current page is remembered between loads. The browser binding is
 * `localStorage`; tests pass a plain object.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const storage: ThemeLayoutStorage = {
 *   getItem: () => null,
 *   setItem: () => undefined,
 * };
 * ```
 */
export interface ThemeLayoutStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * What a {@link ThemeLayoutState} is built from: the theme and form factor it
 * belongs to, the pages it can show, and where to remember the current page.
 *
 * @example
 * ```xml
 * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
 * ```
 * @example
 * ```ts
 * const options: ThemeLayoutStateOptions = {
 *   themeId: "classic-blue",
 *   formFactor: "desktop",
 *   pages: [{ id: "library", overlay: false }],
 *   defaultPageId: "library",
 * };
 * ```
 */
export interface ThemeLayoutStateOptions {
  /** The theme the layout belongs to, used in the storage key. */
  readonly themeId: string;
  /** The form factor the layout renders, used in the storage key. */
  readonly formFactor: FormFactor;
  /** The pages the layout declares. */
  readonly pages: readonly ThemeLayoutPageRef[];
  /** The page shown when nothing is stored; defaults to the first page. */
  readonly defaultPageId?: string;
  /** Where the current page is remembered; defaults to `localStorage`. */
  readonly storage?: ThemeLayoutStorage;
}

/**
 * The navigation state of one mounted layout, keyed per theme id and form
 * factor. It is a plain external store, so React reads it through
 * `useSyncExternalStore` and the pure parts stay testable without a DOM.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="library" labelKey="navigation.library" />
 * ```
 * @example
 * ```ts
 * const state = new ThemeLayoutState({
 *   themeId: "classic-blue",
 *   formFactor: "desktop",
 *   pages: [{ id: "library", overlay: false }],
 * });
 * state.navigate("library"); // true
 * ```
 */
export class ThemeLayoutState {
  private readonly pages: ReadonlyMap<string, ThemeLayoutPageRef>;
  private readonly storage: ThemeLayoutStorage | undefined;
  private readonly storageKey: string;
  private readonly listeners = new Set<() => void>();
  private snapshot: ThemeLayoutSnapshot;

  constructor(options: ThemeLayoutStateOptions) {
    this.pages = new Map(options.pages.map((page) => [page.id, page]));
    this.storage = options.storage ?? defaultStorage();
    this.storageKey = `wmm.theme.page.${options.themeId}.${options.formFactor}`;
    this.snapshot = {
      currentPage:
        this.restore() ?? options.defaultPageId ?? options.pages[0]?.id ?? "",
      previousPage: undefined,
      overlayOpen: false,
      fullscreen: false,
      editMode: false,
      openPanels: new Set<string>(),
      selectedTabs: {},
    };
  }

  /**
   * Shows a page. An overlay page opens over the current one and leaves it
   * underneath; any other page replaces it and closes an open overlay. An
   * unknown id is rejected.
   *
   * @example
   * ```xml
   * <Button command="wmm.ui.navigate" commandParameter="now-playing" labelKey="navigation.nowPlaying" />
   * ```
   * @example
   * ```ts
   * state.navigate("now-playing"); // true
   * state.getSnapshot().overlayOpen; // true
   * ```
   */
  navigate(page: string): boolean {
    const target = this.pages.get(page);
    if (target === undefined) return false;

    if (target.overlay) {
      if (!this.snapshot.overlayOpen) this.update({ overlayOpen: true });
      return true;
    }

    if (this.snapshot.currentPage === page && !this.snapshot.overlayOpen) {
      return true;
    }
    this.update({
      currentPage: page,
      previousPage: this.snapshot.currentPage,
      overlayOpen: false,
    });
    this.persist(page);
    return true;
  }

  /**
   * Opens or closes a collapsible panel. Panels start closed, and the host
   * remembers the set per layout.
   *
   * @example
   * ```xml
   * <Button command="wmm.ui.togglePanel" commandParameter="sidebar" labelKey="navigation.sidebar" />
   * ```
   * @example
   * ```ts
   * state.togglePanel("sidebar");
   * state.getSnapshot().openPanels.has("sidebar"); // true
   * ```
   */
  togglePanel(id: string): boolean {
    const openPanels = new Set(this.snapshot.openPanels);
    if (openPanels.has(id)) openPanels.delete(id);
    else openPanels.add(id);
    this.update({ openPanels });
    return true;
  }

  /**
   * Turns the library's edit mode on or off. The host does not remember it, so
   * a reload starts in playback mode.
   *
   * @example
   * ```xml
   * <Button command="wmm.ui.toggleEditMode" labelKey="common.edit" icon="@icon/edit" />
   * ```
   * @example
   * ```ts
   * state.toggleEditMode();
   * state.getSnapshot().editMode; // true
   * ```
   */
  toggleEditMode(): boolean {
    this.update({ editMode: !this.snapshot.editMode });
    return true;
  }

  /**
   * Selects the tab of one `Tabs` element. The host remembers the selection
   * per layout, so a page switch does not reset it.
   *
   * @example
   * ```xml
   * <Tabs><Tab id="queue" titleKey="playback.queue" /><Tab id="lyrics" titleKey="playback.lyrics" /></Tabs>
   * ```
   * @example
   * ```ts
   * state.selectTab("playback-tabs", "lyrics");
   * state.getSnapshot().selectedTabs["playback-tabs"]; // "lyrics"
   * ```
   */
  selectTab(tabsId: string, tabId: string): void {
    if (this.snapshot.selectedTabs[tabsId] === tabId) return;
    this.update({
      selectedTabs: { ...this.snapshot.selectedTabs, [tabsId]: tabId },
    });
  }

  /**
   * Records whether the document is in full screen. The host calls it from
   * `fullscreenchange`, so a `hideInFullscreen` panel can step aside.
   *
   * @example
   * ```xml
   * <Panel dock="top" hideInFullscreen="true" style="@panel/tab-strip" />
   * ```
   * @example
   * ```ts
   * state.setFullscreen(document.fullscreenElement !== null);
   * state.getSnapshot().fullscreen; // true
   * ```
   */
  setFullscreen(value: boolean): void {
    if (this.snapshot.fullscreen === value) return;
    this.update({ fullscreen: value });
  }

  /**
   * Subscribes to state changes and returns the unsubscribe function.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
   * ```
   * @example
   * ```ts
   * const unsubscribe = state.subscribe(() => render());
   * unsubscribe();
   * ```
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * The current state. The object is stable between changes, so it can be
   * read through `useSyncExternalStore` without looping.
   *
   * @example
   * ```xml
   * <Layout xmlns="urn:wmm:theme:1" spec="1.0" formFactor="desktop" />
   * ```
   * @example
   * ```ts
   * state.getSnapshot().currentPage; // "library"
   * ```
   */
  getSnapshot(): ThemeLayoutSnapshot {
    return this.snapshot;
  }

  /** Replaces the snapshot and notifies every listener. */
  private update(patch: Partial<ThemeLayoutSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  /** The page stored for this theme and form factor, when it still exists. */
  private restore(): string | undefined {
    if (this.storage === undefined) return undefined;
    let stored: string | null;
    try {
      stored = this.storage.getItem(this.storageKey);
    } catch {
      return undefined;
    }
    if (stored === null) return undefined;
    const page = this.pages.get(stored);
    return page === undefined || page.overlay ? undefined : stored;
  }

  /** Remembers the current page, ignoring a storage that refuses writes. */
  private persist(page: string): void {
    if (this.storage === undefined) return;
    try {
      this.storage.setItem(this.storageKey, page);
    } catch {
      return;
    }
  }
}

/** The browser storage, when the environment has one. */
function defaultStorage(): ThemeLayoutStorage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
