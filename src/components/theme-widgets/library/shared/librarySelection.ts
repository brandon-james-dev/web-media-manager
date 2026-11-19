import { useCallback, useSyncExternalStore } from "react";
import { useThemeLayoutSnapshot } from "@/lib/themes/render/browser";

/**
 * What a page's `TrackList` shows: everything, one artist, one album, one
 * genre, one year, one playlist, or one browser view's entries.
 *
 * @example
 * ```xml
 * <LibraryBrowser views="artists albums playlists" initialView="artists" />
 * ```
 * @example
 * ```ts
 * const selection: LibrarySelection = { kind: "album", value: "X&Y" };
 * ```
 */
export type LibrarySelection =
  | { readonly kind: "all" }
  | { readonly kind: "artist"; readonly value: string }
  | { readonly kind: "album"; readonly value: string }
  | { readonly kind: "genre"; readonly value: string }
  | { readonly kind: "year"; readonly value: string }
  | { readonly kind: "playlist"; readonly id: string }
  | {
      readonly kind: "view";
      readonly view: "artists" | "albums" | "genres" | "playlists";
    };

/**
 * The browsing state one theme page keeps: its library query, its sync query,
 * the sources narrowing it, the current selection and the picked songs.
 *
 * @example
 * ```xml
 * <SearchBox scope="library" resultCount="true" />
 * ```
 * @example
 * ```ts
 * const state: LibraryPageState = {
 *   query: "",
 *   syncQuery: "",
 *   sourceIds: [],
 *   selection: { kind: "all" },
 *   selectedSongIds: [],
 * };
 * ```
 */
export interface LibraryPageState {
  /** The library search text of the page. */
  readonly query: string;
  /** The sync-queue search text of the page. */
  readonly syncQuery: string;
  /** The source ids narrowing the page; empty means every source. */
  readonly sourceIds: string[];
  /** What the page's `TrackList` shows. */
  readonly selection: LibrarySelection;
  /** The songs picked in the page's `TrackList`. */
  readonly selectedSongIds: string[];
}

/**
 * The state a page has before anything touches it. One shared object, so an
 * untouched page keeps a stable snapshot.
 *
 * @example
 * ```xml
 * <TrackList variant="table" columns="title artist" />
 * ```
 * @example
 * ```ts
 * const state = EMPTY_LIBRARY_PAGE_STATE;
 * state.selection.kind; // "all"
 * ```
 */
export const EMPTY_LIBRARY_PAGE_STATE: LibraryPageState = {
  query: "",
  syncQuery: "",
  sourceIds: [],
  selection: { kind: "all" },
  selectedSongIds: [],
};

/**
 * The browsing state of every theme page, keyed by page id. A plain external
 * store: React reads it through `useSyncExternalStore`, and the pure parts
 * stay testable without a DOM. A page's state object is replaced only when
 * that page changes, so a snapshot stays stable between changes.
 *
 * @example
 * ```xml
 * <Page id="library" role="library" titleKey="navigation.library" />
 * ```
 * @example
 * ```ts
 * const store = new LibrarySelectionStore();
 * store.setQuery("library", "blue");
 * store.getPage("library").query; // "blue"
 * ```
 */
export class LibrarySelectionStore {
  private readonly pages = new Map<string, LibraryPageState>();
  private readonly listeners = new Set<() => void>();

  /**
   * The state of one page, or the shared empty state when nothing touched it.
   *
   * @example
   * ```xml
   * <Page id="playlists" role="playlists" titleKey="navigation.playlists" />
   * ```
   * @example
   * ```ts
   * store.getPage("playlists").selection; // { kind: "all" }
   * ```
   */
  getPage(page: string): LibraryPageState {
    return this.pages.get(page) ?? EMPTY_LIBRARY_PAGE_STATE;
  }

  /**
   * Replaces the library query of one page.
   *
   * @example
   * ```xml
   * <SearchBox scope="library" placeholderKey="search.placeholder" />
   * ```
   * @example
   * ```ts
   * store.setQuery("library", "aurora");
   * ```
   */
  setQuery(page: string, query: string): void {
    this.patch(page, { query });
  }

  /**
   * Replaces the sync-queue query of one page.
   *
   * @example
   * ```xml
   * <SearchBox scope="sync" placeholderKey="search.placeholder" />
   * ```
   * @example
   * ```ts
   * store.setSyncQuery("sync", "coldplay");
   * ```
   */
  setSyncQuery(page: string, syncQuery: string): void {
    this.patch(page, { syncQuery });
  }

  /**
   * Replaces the source ids narrowing one page.
   *
   * @example
   * ```xml
   * <SearchBox scope="library" sourceFilter="true" />
   * ```
   * @example
   * ```ts
   * store.setSourceIds("library", ["ipod"]);
   * ```
   */
  setSourceIds(page: string, sourceIds: string[]): void {
    this.patch(page, { sourceIds });
  }

  /**
   * Replaces what the page's `TrackList` shows.
   *
   * @example
   * ```xml
   * <LibraryBrowser views="artists albums genres songs" />
   * ```
   * @example
   * ```ts
   * store.select("library", { kind: "artist", value: "Coldplay" });
   * ```
   */
  select(page: string, selection: LibrarySelection): void {
    this.patch(page, { selection });
  }

  /**
   * Replaces the songs picked in the page's `TrackList`.
   *
   * @example
   * ```xml
   * <TrackList variant="table" columns="title artist" />
   * ```
   * @example
   * ```ts
   * store.setSelectedSongIds("library", ["song-1"]);
   * ```
   */
  setSelectedSongIds(page: string, selectedSongIds: string[]): void {
    this.patch(page, { selectedSongIds });
  }

  /**
   * Subscribes to changes and returns the unsubscribe function.
   *
   * @example
   * ```xml
   * <Page id="library" role="library" titleKey="navigation.library" />
   * ```
   * @example
   * ```ts
   * const unsubscribe = store.subscribe(() => render());
   * unsubscribe();
   * ```
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Stores a page's next state and notifies every listener. */
  private patch(page: string, patch: Partial<LibraryPageState>): void {
    const current = this.getPage(page);
    const next: LibraryPageState = { ...current, ...patch };
    if (samePageState(current, next)) return;
    this.pages.set(page, next);
    for (const listener of this.listeners) listener();
  }
}

/**
 * The store the theme widgets share, so a `SearchBox`, a `LibraryBrowser` and
 * a `TrackList` on the same page agree without passing anything down.
 *
 * @example
 * ```xml
 * <SearchBox scope="library" resultCount="true" />
 * ```
 * @example
 * ```ts
 * librarySelectionStore.setQuery("library", "blue");
 * ```
 */
export const librarySelectionStore = new LibrarySelectionStore();

/**
 * What a widget gets from {@link useLibrarySelection}: the current page, its
 * state, and setters already bound to that page.
 *
 * @example
 * ```xml
 * <TrackList variant="list" fields="artwork artist duration" />
 * ```
 * @example
 * ```ts
 * const { state, select } = useLibrarySelection();
 * select({ kind: "all" });
 * ```
 */
export interface LibrarySelectionHandle {
  /** The theme page the state belongs to. */
  readonly page: string;
  /** The page's browsing state. */
  readonly state: LibraryPageState;
  /** Replaces the page's library query. */
  readonly setQuery: (query: string) => void;
  /** Replaces the page's sync-queue query. */
  readonly setSyncQuery: (syncQuery: string) => void;
  /** Replaces the page's source filter. */
  readonly setSourceIds: (sourceIds: string[]) => void;
  /** Replaces the page's selection. */
  readonly select: (selection: LibrarySelection) => void;
  /** Replaces the page's picked songs. */
  readonly setSelectedSongIds: (selectedSongIds: string[]) => void;
}

/**
 * The browsing state of the page the layout currently shows, re-rendering the
 * caller whenever it changes. The page id comes from the layout snapshot, so
 * every widget on one page shares one state and two pages never do.
 *
 * @example
 * ```xml
 * <SearchBox scope="library" resultCount="true" />
 * ```
 * @example
 * ```ts
 * const { state } = useLibrarySelection();
 * state.query; // ""
 * ```
 */
export function useLibrarySelection(): LibrarySelectionHandle {
  const { currentPage } = useThemeLayoutSnapshot();

  const subscribe = useCallback(
    (listener: () => void) => librarySelectionStore.subscribe(listener),
    []
  );
  const getSnapshot = useCallback(
    () => librarySelectionStore.getPage(currentPage),
    [currentPage]
  );
  const state = useSyncExternalStore(subscribe, getSnapshot);

  const setQuery = useCallback(
    (query: string) => librarySelectionStore.setQuery(currentPage, query),
    [currentPage]
  );
  const setSyncQuery = useCallback(
    (syncQuery: string) =>
      librarySelectionStore.setSyncQuery(currentPage, syncQuery),
    [currentPage]
  );
  const setSourceIds = useCallback(
    (sourceIds: string[]) =>
      librarySelectionStore.setSourceIds(currentPage, sourceIds),
    [currentPage]
  );
  const select = useCallback(
    (selection: LibrarySelection) =>
      librarySelectionStore.select(currentPage, selection),
    [currentPage]
  );
  const setSelectedSongIds = useCallback(
    (selectedSongIds: string[]) =>
      librarySelectionStore.setSelectedSongIds(currentPage, selectedSongIds),
    [currentPage]
  );

  return {
    page: currentPage,
    state,
    setQuery,
    setSyncQuery,
    setSourceIds,
    select,
    setSelectedSongIds,
  };
}

/** Whether two page states hold the same values. */
function samePageState(a: LibraryPageState, b: LibraryPageState): boolean {
  return (
    a.query === b.query &&
    a.syncQuery === b.syncQuery &&
    sameIds(a.sourceIds, b.sourceIds) &&
    sameSelection(a.selection, b.selection) &&
    sameIds(a.selectedSongIds, b.selectedSongIds)
  );
}

/** Whether two id lists hold the same ids in the same order. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/** Whether two selections point at the same thing. */
function sameSelection(a: LibrarySelection, b: LibrarySelection): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "all" || b.kind === "all") return true;
  if (a.kind === "view" && b.kind === "view") return a.view === b.view;
  if (a.kind === "view" || b.kind === "view") return false;
  if (a.kind === "playlist" && b.kind === "playlist") return a.id === b.id;
  if (a.kind === "playlist" || b.kind === "playlist") return false;
  return a.value === b.value;
}
