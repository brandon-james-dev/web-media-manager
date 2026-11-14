import { PlayerControls } from "@/components/player-controls";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toggle } from "@/components/ui/toggle";
import { SourceFilter } from "@/components/source-filter";
import { useSongs, useSync } from "@/hooks";
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
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { getSourcesStore } from "@/core/ports";
import {
  Outlet,
  NavLink,
  useLocation,
  useParams,
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
  sort: {
    selector: (item: Song) => any;
    desc: boolean;
  };
  setSort: React.Dispatch<
    React.SetStateAction<{
      selector: (item: Song) => any;
      desc: boolean;
    }>
  >;
};

const PATH_TABS = ["playlists", "albums", "artists"] as const;

function tabFromPathname(pathname: string) {
  return PATH_TABS.find((tab) => pathname.includes(tab)) ?? "songs";
}

function modeFromParam(mode: string | undefined) {
  return mode === "edit" ? "edit" : "playback";
}

function MainLayout() {
  //#region State
  const { pathname } = useLocation();
  const { mode } = useParams();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isTv = useIsTv();
  // Phones and tablets share the compact chrome (bottom bars, no header tabs).
  const isCompact = isMobile || isTablet;
  const navigate = useNavigate();

  const isSyncPage = pathname.startsWith("/sync");

  // Queue length shown as a badge on the Sync nav pill until it is synced.
  const { queuedSongs } = useSync();

  const activeTab = isSyncPage ? "sync" : tabFromPathname(pathname);
  const activeMode = isSyncPage ? undefined : modeFromParam(mode);

  const routeMode = activeMode ?? "playback";

  const { query, setQuery, total, filteredTotal } = useSongs();

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
                render={
                  <NavLink
                    to={`songs/${routeMode}`}
                    draggable={false}
                    className="flex items-center gap-2 cursor-default"
                  >
                    <Music className="h-4 w-4" />
                    Songs
                  </NavLink>
                }
              />

              <TabsTrigger
                value="albums"
                render={
                  <NavLink
                    to={`albums/${routeMode}`}
                    draggable={false}
                    className="flex items-center gap-2 cursor-default"
                  >
                    <DiscAlbum className="h-4 w-4" />
                    Albums
                  </NavLink>
                }
              />

              <TabsTrigger
                value="artists"
                render={
                  <NavLink
                    to={`artists/${routeMode}`}
                    draggable={false}
                    className="flex items-center gap-2 cursor-default"
                  >
                    <MicVocal className="h-4 w-4" />
                    Artists
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
              placeholder="Search..."
              value={queryText}
              onChange={handleFilterTextChange}
              disabled={isSyncPage}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            {filteredTotal != total && (
              <InputGroupAddon align="inline-end">
                {filteredTotal} results
              </InputGroupAddon>
            )}
            <InputGroupAddon align="inline-end">
              <SourceFilter
                selected={selectedSourceIds}
                onSelectedChange={setSelectedSourceIds}
                anchor={searchAnchor}
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
              navigate(`${activeTab}/${pressed ? "edit" : "playback"}`);
            }}
          >
            <Pen className="h-4 w-4" />
            Edit
          </Toggle>

          <div className="relative rounded-lg bg-muted py-px px-2">
            <NavLink
              to={`playlists/${routeMode}`}
              draggable={false}
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
              Playlists
            </NavLink>
          </div>

          <div className="relative rounded-lg bg-muted py-px px-2">
            <NavLink
              to="sync"
              draggable={false}
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
              Sync
            </NavLink>

            {queuedSongs.length > 0 && (
              <Badge className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 h-4.5 min-w-4.5 rounded-full px-1 text-[0.65rem] font-semibold tabular-nums">
                {queuedSongs.length > 99 ? "99+" : queuedSongs.length}
              </Badge>
            )}
          </div>
        </div>
      </div>
      )}

      <div className="flex-1 overflow-hidden">
        <Outlet
          context={{
            queryText,
            activeMode,
            selectedSourceIds,
            setSelectedSourceIds,
            sort,
            setSort,
          }}
        />
      </div>

      <div
        ref={chromeRef}
        className={cn(
          "relative w-full shrink-0 px-2 pb-2",
          isCompact && "mx-auto max-w-3xl",
          isTablet && showBottomNav && "flex items-stretch gap-2"
        )}
      >
        {isMobileSearchOpen && (
          <div className="absolute bottom-full left-0 right-0 z-70 mb-2 overflow-hidden rounded-xl border shadow-lg bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg">
            <InputGroup className="h-14 border-0">
              <InputGroupInput
                ref={mobileSearchRef}
                placeholder="Search..."
                value={queryText}
                onChange={handleFilterTextChange}
                enterKeyHint="search"
                inputMode="search"
              />
              <InputGroupAddon className="p-4">
                <Search />
              </InputGroupAddon>
              {filteredTotal != total && (
                <InputGroupAddon className="p-4" align="inline-end">
                  {filteredTotal} results
                </InputGroupAddon>
              )}
            </InputGroup>
          </div>
        )}

        <div
          className={cn(
            "w-full min-w-0 shrink-0 overflow-hidden rounded-xl shadow-lg",
            isTablet && showBottomNav && "order-2 min-w-0 flex-1",
            isCompact &&
            activeMode === "playback" &&
            "relative z-60 overflow-visible"
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
              "relative z-60 w-full min-w-0 shrink-0 rounded-xl border shadow-lg bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg",
              isTablet && showBottomNav && "order-1 min-w-0 flex-1"
            )}
          >
            <div className="flex h-full items-stretch justify-center">
              {(
                [
                  {
                    tab: "songs",
                    label: "Songs",
                    icon: <Music className="h-5 w-5" />,
                  },
                  {
                    tab: "albums",
                    label: "Albums",
                    icon: <DiscAlbum className="h-5 w-5" />,
                  },
                  {
                    tab: "artists",
                    label: "Artists",
                    icon: <MicVocal className="h-5 w-5" />,
                  },
                  {
                    tab: "playlists",
                    label: "Playlists",
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
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={toggleMobileSearch}
                aria-expanded={isMobileSearchOpen}
                aria-current={isMobileSearchOpen ? "page" : undefined}
                className={cn(
                  "flex h-full cursor-default flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
                  isMobile ? "flex-1" : "px-3",
                  isMobileSearchOpen
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                <Search className="h-5 w-5" />
                <span>Search</span>
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

export { type MainContext, MainLayout };
