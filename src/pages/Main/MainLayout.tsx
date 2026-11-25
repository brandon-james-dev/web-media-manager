import { PlayerControls } from "@/components/player-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  LibrarySidebar,
  SidebarDragProvider,
  parseSidebarDropId,
  songIdsFromDrag,
  useSidebarDrag,
  type SidebarView,
} from "@/components/library-sidebar";
import { addSongsToPlaylist, removeSongFromPlaylist } from "@/core/playlists";
import { wmmBus } from "@/events";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { SourceFilter } from "@/components/source-filter";
import { useSongs, useSync } from "@/hooks";
import { useTranslation } from "@/i18n";
import type { QueryOptions } from "@/lib/persistence";
import type { Song } from "@/models";
import {
  Music,
  DiscAlbum,
  Search,
  Pen,
  MonitorSmartphone,
  MicVocal,
  ListMusic,
  PanelRight,
} from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { getSourcesStore } from "@/core/ports";
import {
  Outlet,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";
import { Editor } from "@/components/editor";
import { useIsMobile, useIsTablet, useIsTv } from "@/lib/hooks/useIsMobile";
import { cn } from "cn";

type MainContext = {
  queryText: string;
  activeMode: "edit" | "playback" | undefined;
  selectedSourceIds: string[];
  setSelectedSourceIds: React.Dispatch<React.SetStateAction<string[]>>;
  sort?: {
    selector: (item: Song) => any;
    desc: boolean;
  };
  setSort: React.Dispatch<
    React.SetStateAction<
      | {
        selector: (item: Song) => any;
        desc: boolean;
      }
      | undefined
    >
  >;
  /**
   * Forward a track dropped on a sidebar target. The song table owns its own
   * drag context for column reordering, so a track drag inside it never
   * reaches the layout's context and has to be handed up.
   */
  onTrackDrop: (event: DragEndEvent) => void;
};

const PATH_TABS = ["playlists", "albums", "artists"] as const;

function tabFromPathname(pathname: string) {
  return PATH_TABS.find((tab) => pathname.includes(tab)) ?? "songs";
}

function modeFromParam(mode: string | undefined) {
  return mode === "edit" ? "edit" : "playback";
}

/** The `:mode` segment of a tab path, e.g. `/songs/edit` -> "edit". */
function modeFromPath(pathname: string) {
  return pathname.split("/").filter(Boolean)[1];
}

/**
 * The layout's single drag context.
 *
 * It sits inside the provider so it can run the handlers nested views
 * registered, and it owns the sensors so every draggable in the layout shares
 * one activation threshold.
 */
/**
 * Keeps the drag ghost centred on the pointer.
 *
 * Without it the overlay keeps the dragged row's own position, so the ghost is
 * centred on the row rather than the cursor until the pointer moves, and stays
 * offset by however far from the row's centre it was grabbed.
 */
const centerOnCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  transform,
}) => {
  if (!(activatorEvent instanceof PointerEvent) || draggingNodeRect === null) {
    return transform;
  }

  const offsetX =
    activatorEvent.clientX - draggingNodeRect.left - draggingNodeRect.width / 2;
  const offsetY =
    activatorEvent.clientY - draggingNodeRect.top - draggingNodeRect.height / 2;

  return { ...transform, x: transform.x + offsetX, y: transform.y + offsetY };
};

/** Take each song out of the playlist, one write per song. */
async function removeFromPlaylist(
  playlistId: string,
  songIds: string[]
): Promise<void> {
  for (const songId of songIds) {
    try {
      await removeSongFromPlaylist(playlistId, songId);
    } catch (error) {
      console.warn("Could not remove the track from the playlist", error);
    }
  }
}

/**
 * Only a target the pointer is actually inside counts.
 *
 * `closestCenter` returns the nearest droppable wherever the pointer is, so a
 * sidebar row lit up while the pointer was still out in the library. Returning
 * nothing when the pointer is outside every zone also keeps the drop-outside
 * gesture (dragging a track out of a playlist) working, since `over` is null.
 */
const pointerOnlyCollision: CollisionDetection = (args) => pointerWithin(args);

/**
 * The routed page, behind a memo boundary.
 *
 * Opening the sidebar is layout state, not page state, but it re-renders this
 * layout and with it `Outlet` and the whole route subtree. A song table of
 * thousands of rows takes seconds to re-render, so the page is held behind a
 * memo keyed on the outlet context: an unrelated re-render of the layout stops
 * here instead of reaching the table.
 */
const PageHost = memo(function PageHost({
  context,
}: {
  context: MainContext;
}) {
  return <Outlet context={context} />;
});

function SidebarDndArea({
  onSidebarDrop,
  enabled,
  children,
}: {
  onSidebarDrop: (event: DragEndEvent) => void;
  /** No drop targets while the sidebar is closed, so no drag may start. */
  enabled: boolean;
  children: ReactNode;
}) {
  const drag = useSidebarDrag();
  const { t } = useTranslation();
  // The ghost follows the pointer, so it carries the dragged row's title and
  // artist, how many songs travel with it, and how far it is leaning.
  const [ghost, setGhost] = useState<{
    title: string;
    artist: string;
    count: number;
  } | null>(null);
  const [lean, setLean] = useState(0);
  const lastDeltaX = useRef(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    // A card-sized source (an album cover, an artist row) is easy to nudge by
    // a few pixels while clicking, so the drag only starts once the pointer
    // has travelled far enough to be deliberate.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    })
  );

  const settle = () => {
    if (settleTimer.current !== null) {
      clearTimeout(settleTimer.current);
    }
    settleTimer.current = setTimeout(() => setLean(0), 140);
  };

  return (
    <DndContext
      sensors={enabled ? sensors : []}
      collisionDetection={pointerOnlyCollision}
      onDragStart={(event: DragStartEvent) => {
        const data = event.active.data.current ?? {};
        const songIds = songIdsFromDrag(data);

        // Only a track drag gets the carried-card ghost. A column header is
        // sortable too and carries no song data, so building a ghost for it
        // showed a card reading "Track" while reordering columns.
        setGhost(
          songIds.length === 0
            ? null
            : {
                title: typeof data.title === "string" ? data.title : t("metadata.track"),
                artist: typeof data.artist === "string" ? data.artist : "",
                count: songIds.length,
              }
        );
        lastDeltaX.current = 0;
        setLean(0);
      }}
      onDragMove={(event: DragMoveEvent) => {
        // Lean with the pointer's horizontal travel and settle back when it
        // stops, so the ghost hangs like something carried rather than
        // swinging on its own.
        const step = event.delta.x - lastDeltaX.current;
        lastDeltaX.current = event.delta.x;
        setLean(Math.max(-10, Math.min(10, step * 1.2)));
        settle();
      }}
      onDragEnd={(event) => {
        setGhost(null);
        setLean(0);
        onSidebarDrop(event);
        drag?.runDragEnd(event);
      }}
      onDragCancel={() => {
        setGhost(null);
        setLean(0);
      }}
    >
      {children}
      <DragOverlay dropAnimation={null} modifiers={[centerOnCursor]}>
        {ghost === null ? null : (
          // The overlay box takes the dragged row's size; centring the card
          // inside it keeps the card under the pointer.
          <div className="flex h-full w-full items-center justify-center">
            <div
              className="relative max-w-64"
              style={{
                transform: `rotate(${lean}deg)`,
                transformOrigin: "top center",
                transition: "transform 120ms ease-out",
              }}
            >
              {/* Up to three rows peek out underneath the top card, so a long
                  selection still reads as a short stack. */}
              {Array.from({
                length: Math.min(Math.max(ghost.count - 1, 0), 3),
              }).map((_, layer) => (
                <div
                  key={layer}
                  className="absolute inset-x-0 top-0 rounded-md border bg-background/40"
                  style={{
                    height: "100%",
                    transform: `translateY(${(layer + 1) * 5}px)`,
                  }}
                />
              ))}

              <div className="relative flex items-center gap-2 rounded-md border bg-background/60 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                <span className="min-w-0 truncate text-sm">{ghost.title}</span>
                {ghost.artist !== "" && (
                  <span className="min-w-0 shrink-0 truncate text-xs text-muted-foreground">
                    {ghost.artist}
                  </span>
                )}
                {ghost.count > 1 && (
                  <Badge className="shrink-0 tabular-nums">{ghost.count}</Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function MainLayout() {
  //#region State
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTv = useIsTv();
  // Phones and tablets share the compact chrome (bottom bars, no header tabs).
  const isCompact = isMobile || isTablet;
  const navigate = useNavigate();
  const { t } = useTranslation();

  const isSyncPage = pathname.startsWith("/sync");
  const isPlaylistsPage = pathname.includes("playlists");
  // Search filters the library, which is not what these pages show.
  const searchDisabled = isSyncPage || isPlaylistsPage;

  // Queue length shown as a badge on the Sync nav pill until it is synced.
  const { queuedSongs } = useSync();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // What the sidebar shows. The nav buttons switch this instead of routing,
  // so the library page in the main area stays put.
  const [sidebarView, setSidebarView] = useState<SidebarView>("playlists");

  // A view already open full screen must not also appear in the sidebar: the
  // same list twice, the narrower copy duplicating the page beside it.
  const sidebarBlocked =
    (isPlaylistsPage && sidebarView === "playlists") ||
    (isSyncPage && sidebarView === "sync");
  const sidebarVisible = sidebarOpen && !sidebarBlocked;

  /**
   * Stable across renders: the outlet context is a dependency of every page
   * below this layout, so a fresh object here re-renders the whole library —
   * including a song table of thousands of rows — on any unrelated state
   * change such as opening the sidebar.
   */
  const handleSidebarDrop = useCallback((event: DragEndEvent): void => {
    const data = event.active.data.current;
    const songIds = songIdsFromDrag(data);
    const target = parseSidebarDropId(event.over?.id);
    const fromPlaylistId =
      typeof data?.fromPlaylistId === "string" ? data.fromPlaylistId : null;

    if (songIds.length === 0) {
      return;
    }

    // Dropped outside every target while dragging out of a playlist: that is
    // the "take it out" gesture, so the tracks leave the playlist.
    if (target === null) {
      if (fromPlaylistId !== null) {
        void removeFromPlaylist(fromPlaylistId, songIds);
      }
      return;
    }

    if (target.kind === "remove") {
      void removeFromPlaylist(target.playlistId, songIds);
      return;
    }

    if (target.kind === "playlist") {
      void addSongsToPlaylist(target.playlistId, songIds).catch((error) => {
        console.warn("Could not add the tracks to the playlist", error);
      });
      return;
    }

    wmmBus.invoke("wmm.sync.queueSongs", { songIds });
  }, []);

  const activeTab = isSyncPage ? "sync" : tabFromPathname(pathname);
  // `useParams()` here only sees this layout route's params, never the child
  // route's `:mode`, so the mode is read from the pathname instead — otherwise
  // `activeMode` is permanently "playback" and the Edit toggle cannot switch.
  const activeMode = isSyncPage ? undefined : modeFromParam(modeFromPath(pathname));

  const routeMode = activeMode ?? "playback";

  /** Tracks can only be dragged while there is somewhere to drop them. */
  const dragEnabled = sidebarVisible && activeMode !== "edit";

  const { query, setQuery, total, filteredTotal, showHidden, setShowHidden, hiddenCount } =
    useSongs();

  const [sourceCount, setSourceCount] = useState<number | null>(null);
  useEffect(() => {
    const store = getSourcesStore();
    const load = () =>
      void store.getSources().then((next) => setSourceCount(next.length));
    load();
    const unsubAdded = store.onSourceAdded(load);
    const unsubCleared = store.onSourcesCleared(load);
    return () => {
      unsubAdded();
      unsubCleared();
    };
  }, [total]);
  const hasSources = (sourceCount ?? 0) > 0;

  const [sort, setSort] = useState<{
    selector: (item: Song) => any;
    desc: boolean;
  }>();

  const [queryText, setQueryText] = useState<string>("");
  // Source filter shared by the Songs, Albums and Artists pages. Empty means
  // "every source"; the chips live in each page's own filter bar.
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  // Mobile: the search field lives above the bottom nav and is toggled by a
  // Search tab there, instead of always occupying header width.
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Opening the field should drop the keyboard straight away; closing it
  // blurs. Clearing the query happens in the toggle handler (the event that
  // caused it) so no setState runs synchronously inside this effect.
  useEffect(() => {
    if (isMobileSearchOpen) {
      mobileSearchRef.current?.focus();
    } else {
      mobileSearchRef.current?.blur();
    }
  }, [isMobileSearchOpen]);
  //#endregion

  //#region Interactivity Handlers
  function toggleMobileSearch(): void {
    if (isMobileSearchOpen) {
      setIsMobileSearchOpen(false);
      // A hidden search box must not keep narrowing the results.
      setQueryText("");
    } else {
      setIsMobileSearchOpen(true);
    }
  }

  function handleFilterTextChange(
    evt: ChangeEvent<HTMLInputElement, HTMLInputElement>
  ): void {
    const text = evt.target.value;
    setQueryText(text);

    const textQuery = {
      ...query,
      sort,
      filter: (song: Song) =>
        song.title?.toLowerCase().includes(text.toLowerCase()) ||
        song.album?.toLowerCase().includes(text.toLowerCase()) ||
        song.artist?.toLowerCase().includes(text.toLowerCase()) ||
        song.genre?.toLowerCase().includes(text.toLowerCase()),
    } as QueryOptions<Song>;

    setQuery(textQuery);
  }
  //#endregion

  // The compact bottom navigation replaces the header tabs on phones and
  // tablets. Sync is desktop-first and stays reachable by URL.
  const showBottomNav =
    isCompact && hasSources && (total ?? 0) > 0 && !isSyncPage;

  // The album drawer portals to <body>, so it cannot read this subtree's
  // layout. Publish the bottom chrome's measured height as a root variable
  // instead of hardcoding an offset per breakpoint.
  const chromeRef = useRef<HTMLDivElement>(null);
  // Anchor for the source-filter popup: the search field, so the popup opens
  // centred on it. Held in state (via a callback ref) rather than read from a
  // ref during render.
  const [searchAnchor, setSearchAnchor] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = chromeRef.current;
    if (!el) return;

    const apply = () => {
      document.documentElement.style.setProperty(
        "--sheet-offset",
        `${el.offsetHeight}px`
      );
    };

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--sheet-offset");
    };
  }, [showBottomNav]);

  const outletContext: MainContext = useMemo(
    () => ({
      queryText,
      activeMode,
      selectedSourceIds,
      setSelectedSourceIds,
      sort,
      setSort,
      onTrackDrop: handleSidebarDrop,
    }),
    [
      queryText,
      activeMode,
      selectedSourceIds,
      setSelectedSourceIds,
      sort,
      setSort,
      handleSidebarDrop,
    ]
  );

  /**
   * The page element is memoized so a sidebar toggle cannot re-render it.
   * `Outlet` re-renders with this layout, and with it the whole route subtree —
   * a song table of thousands of rows costs seconds per toggle. Holding the
   * element lets React bail out on the identical reference instead.
   */
  const page = useMemo(
    () => <PageHost context={outletContext} />,
    [outletContext]
  );
  return (
    <div className="flex flex-col h-full select-none">
      {!isTv && (
        <div
          className="border-b px-4 py-2 flex gap-2 items-center justify-between"
          hidden={isCompact || !hasSources || (total ?? 0) == 0}
        >
          <div className="flex shrink-0 items-center gap-2" hidden={isCompact || isTv}>
            <Tabs value={activeTab}>
              <TabsList>
                <TabsTrigger
                  value="songs"
                  nativeButton={false}
                  render={
                    <NavLink
                      to={`songs/${routeMode}`}
                      draggable={false}
                      className="flex items-center gap-2 cursor-default"
                    >
                      <Music className="h-4 w-4" />
                      {t("navigation.songs")}
                    </NavLink>
                  }
                />

                <TabsTrigger
                  value="albums"
                  nativeButton={false}
                  render={
                    <NavLink
                      to={`albums/${routeMode}`}
                      draggable={false}
                      className="flex items-center gap-2 cursor-default"
                    >
                      <DiscAlbum className="h-4 w-4" />
                      {t("navigation.albums")}
                    </NavLink>
                  }
                />

                <TabsTrigger
                  value="artists"
                  nativeButton={false}
                  render={
                    <NavLink
                      to={`artists/${routeMode}`}
                      draggable={false}
                      className="flex items-center gap-2 cursor-default"
                    >
                      <MicVocal className="h-4 w-4" />
                      {t("navigation.artists")}
                    </NavLink>
                  }
                />
              </TabsList>
            </Tabs>
          </div>

          <div
            className="flex min-w-0 flex-1 items-center justify-center"
            hidden={isCompact}
          >
            <InputGroup ref={setSearchAnchor} className="w-full max-w-xs">
              <InputGroupInput
                placeholder={t("search.placeholder")}
                value={queryText}
                onChange={handleFilterTextChange}
                disabled={searchDisabled}
              />
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              {filteredTotal != total && (
                <InputGroupAddon align="inline-end">
                  {t("search.resultCount", [filteredTotal ?? 0])}
                </InputGroupAddon>
              )}
              <InputGroupAddon align="inline-end">
                <SourceFilter
                  selected={selectedSourceIds}
                  onSelectedChange={setSelectedSourceIds}
                  anchor={searchAnchor}
                  showHidden={showHidden}
                  onShowHiddenChange={setShowHidden}
                  hiddenCount={hiddenCount}
                />
              </InputGroupAddon>
            </InputGroup>
          </div>

          <div className="flex shrink-0 items-center gap-2" hidden={isCompact}>
            <Toggle
              variant="outline"
              className="bg-muted aria-pressed:bg-accent"
              disabled={isSyncPage}
              pressed={!isSyncPage && activeMode === "edit"}
              onPressedChange={(pressed) => {
                // Absolute, so the path resolves from the root rather than
                // relative to this layout route.
                navigate(`/${activeTab}/${pressed ? "edit" : "playback"}`);
              }}
            >
              <Pen className="h-4 w-4" />
              {t("common.edit")}
            </Toggle>

            <div className="relative rounded-lg bg-muted py-px px-2">
              <NavLink
                to={`playlists/${routeMode}`}
                draggable={false}
                onClick={(event) => {
                  // Already open full screen: let the navigation happen rather
                  // than putting the same list in the sidebar.
                  if (!sidebarOpen || isPlaylistsPage) return;
                  event.preventDefault();
                  setSidebarView("playlists");
                }}
                className={({ isActive }) => `
                inline-flex items-center gap-2
                p-0.75 rounded-md
                text-sm font-medium
                transition-all cursor-default

                ${isActive
                    ? "text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
              `}
              >
                <ListMusic className="h-4 w-4" />
                {t("navigation.playlists")}
              </NavLink>
            </div>

            <div className="relative rounded-lg bg-muted py-px px-2">
              <NavLink
                to="sync"
                draggable={false}
                onClick={(event) => {
                  if (!sidebarOpen || isSyncPage) return;
                  event.preventDefault();
                  setSidebarView("sync");
                }}
                className={({ isActive }) => `
                inline-flex items-center gap-2
                p-0.75 rounded-md
                text-sm font-medium
                transition-all cursor-default

                ${isActive
                    ? "text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
              `}
              >
                <MonitorSmartphone className="h-4 w-4" />
                {t("navigation.sync")}
              </NavLink>

              {queuedSongs.length > 0 && (
                <Badge className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 h-4.5 min-w-4.5 rounded-full px-1 text-[0.65rem] font-semibold tabular-nums">
                  {queuedSongs.length > 99 ? "99+" : queuedSongs.length}
                </Badge>
              )}
            </div>

            <Button
              size="icon"
              variant={sidebarVisible ? "secondary" : "ghost"}
              className="shrink-0"
              title={
                sidebarBlocked
                  ? t("navigation.sidebarBlocked")
                  : t("navigation.sidebar")
              }
              aria-label={t("navigation.sidebar")}
              aria-pressed={sidebarVisible}
              disabled={sidebarBlocked}
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <PanelRight />
            </Button>
          </div>
        </div>
      )}

      <SidebarDragProvider>
        <SidebarDndArea
          onSidebarDrop={handleSidebarDrop}
          enabled={dragEnabled}
        >
          <div
            className="relative flex min-h-0 flex-1 overflow-hidden"
            data-drag-enabled={dragEnabled ? "true" : undefined}
          >
            <div className="min-w-0 flex-1 overflow-hidden">{page}</div>

            {sidebarVisible && (
              // Narrow and overlaid on small screens so the track list stays
              // visible beside it and remains draggable; a fixed column from md.
              <div
                className={cn(
                  "absolute inset-y-0 right-0 z-raised w-56 border-l shadow-lg",
                  "md:static md:w-96 md:shadow-none"
                )}
              >
                {sidebarView === "playlists" ? (
                  <LibrarySidebar
                    view="playlists"
                    onClose={() => setSidebarOpen(false)}
                  />
                ) : (
                  <LibrarySidebar
                    view="sync"
                    onClose={() => setSidebarOpen(false)}
                  />
                )}
              </div>
            )}
          </div>
        </SidebarDndArea>
      </SidebarDragProvider>

      {!isTv && (
        <div
          ref={chromeRef}
          className={cn(
            "relative w-full shrink-0 px-2 pb-2",
            isCompact && "mx-auto max-w-3xl",
            isTablet && showBottomNav && "flex items-stretch gap-2"
          )}
        >
          {isMobileSearchOpen && (
            <div className="absolute bottom-full left-0 right-0 z-popover mb-2 overflow-hidden rounded-xl border shadow-lg bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg">
              <InputGroup className="h-14 border-0">
                <InputGroupInput
                  ref={mobileSearchRef}
                  placeholder={t("search.placeholder")}
                  value={queryText}
                  onChange={handleFilterTextChange}
                  enterKeyHint="search"
                  inputMode="search"
                  disabled={searchDisabled}
                />
                <InputGroupAddon className="p-4">
                  <Search />
                </InputGroupAddon>
                {filteredTotal != total && (
                  <InputGroupAddon className="p-4" align="inline-end">
                    {t("search.resultCount", [filteredTotal ?? 0])}
                  </InputGroupAddon>
                )}
                <InputGroupAddon className="p-4" align="inline-end">
                  <SourceFilter
                    selected={selectedSourceIds}
                    onSelectedChange={setSelectedSourceIds}
                    showHidden={showHidden}
                    onShowHiddenChange={setShowHidden}
                    hiddenCount={hiddenCount}
                  />
                </InputGroupAddon>
              </InputGroup>
            </div>
          )}

          <div
            className={cn(
              "w-full min-w-0 shrink-0 overflow-hidden rounded-xl shadow-lg",
              isTablet && showBottomNav && "order-2 min-w-0 flex-1",
              isCompact &&
              activeMode === "playback" &&
              "relative z-chrome-row overflow-visible"
            )}
            hidden={isSyncPage || !hasSources || (total ?? 0) === 0}
          >
            {activeMode === "edit" && (
              <Editor
                mode={activeTab as "songs" | "albums" | "artists" | "playlists"}
              />
            )}

            {activeMode === "playback" && <PlayerControls />}
          </div>

          {showBottomNav && (
            <nav
              className={cn(
                "relative z-chrome-row w-full min-w-0 shrink-0 rounded-xl border shadow-lg bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg",
                isTablet && showBottomNav && "order-1 min-w-0 flex-1"
              )}
            >
              <div className="flex h-full items-stretch justify-center">
                {(
                  [
                    {
                      tab: "songs",
                      labelKey: "navigation.songs",
                      icon: <Music className="h-5 w-5" />,
                    },
                    {
                      tab: "albums",
                      labelKey: "navigation.albums",
                      icon: <DiscAlbum className="h-5 w-5" />,
                    },
                    {
                      tab: "artists",
                      labelKey: "navigation.artists",
                      icon: <MicVocal className="h-5 w-5" />,
                    },
                    {
                      tab: "playlists",
                      labelKey: "navigation.playlists",
                      icon: <ListMusic className="h-5 w-5" />,
                    },
                  ] as const
                ).map((item) => {
                  const isActive = activeTab === item.tab;
                  return (
                    <NavLink
                      key={item.tab}
                      to={`${item.tab}/${routeMode}`}
                      draggable={false}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-full flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                        isMobile ? "flex-1" : "px-3",
                        isActive
                          ? "text-foreground font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {item.icon}
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  );
                })}

                <button
                  type="button"
                  onClick={toggleMobileSearch}
                  disabled={searchDisabled}
                  aria-expanded={isMobileSearchOpen}
                  aria-current={isMobileSearchOpen ? "page" : undefined}
                  className={cn(
                    "flex h-full cursor-default flex-col items-center justify-center gap-1 py-2 text-xs transition-colors disabled:pointer-events-none disabled:opacity-50",
                    isMobile ? "flex-1" : "px-3",
                    isMobileSearchOpen
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <Search className="h-5 w-5" />
                  <span>{t("search.label")}</span>
                </button>
              </div>
            </nav>
          )}
        </div>
      )}
      {isTv && <PlayerControls hideBar />}
    </div>
  );
}

export { type MainContext, MainLayout };
