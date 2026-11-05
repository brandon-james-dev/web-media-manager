import { PlayerControls } from "@/components/player-controls";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSongs, useSync } from "@/hooks";
import type { QueryOptions } from "@/lib/persistence";
import type { Song } from "@/models";
import { Music, DiscAlbum, Search, Pen, MonitorSmartphone, MicVocal } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Outlet, NavLink, useLocation, useParams, useNavigate } from "react-router";
import { Editor } from "@/components/editor";
import { Toggle } from "@/components/ui/toggle";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { cn } from "cn";

type MainContext = {
  queryText: string;
  activeMode: "edit" | "playback" | undefined;
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

function MainLayout() {
  //#region State
  const { pathname } = useLocation();
  const { mode } = useParams();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const isSyncPage = pathname.startsWith("/sync");

  // Queue length shown as a badge on the Sync nav pill until it is synced.
  const { queuedSongs } = useSync();

  const activeTab = isSyncPage
    ? "sync"
    : pathname.includes("albums")
      ? "albums"
      : pathname.includes("artists")
        ? "artists"
        : "songs";

  const activeMode = isSyncPage ? undefined : mode === "edit" ? "edit" : "playback";

  const routeMode = activeMode ?? "playback";

  const { query, setQuery, total, filteredTotal } = useSongs();

  const [sort, setSort] = useState<{
    selector: (item: Song) => any;
    desc: boolean;
  }>();

  const [queryText, setQueryText] = useState<string>("");
  // Mobile: the search field lives above the bottom nav and is toggled by a
  // Search tab there, instead of always occupying header width.
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState<boolean>(false);
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  // Opening the field should drop the keyboard straight away; closing it
  // clears the filter so a hidden search box isn't silently narrowing results.
  useEffect(() => {
    if (isMobileSearchOpen) {
      mobileSearchRef.current?.focus();
    } else {
      setQueryText("");
      mobileSearchRef.current?.blur();
    }
  }, [isMobileSearchOpen, setQueryText]);
  //#endregion

  //#region Interactivity Handlers
  function handleFilterTextChange(evt: ChangeEvent<HTMLInputElement, HTMLInputElement>): void {
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

  return (
    <div className="flex flex-col h-full select-none">
      <div
        className="border-b px-4 py-2 flex gap-2 items-center justify-between"
        hidden={(total ?? 0) == 0}
      >
        <div className="w-45 sm:flex">
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
        </div>
        {/* On mobile search moves above the bottom nav (toggled there). */}
        <div className="w-full md:w-120" hidden={isMobile}>
          <InputGroup className="max-w-xs mx-auto">
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
              <InputGroupAddon align="inline-end">{filteredTotal} results</InputGroupAddon>
            )}
          </InputGroup>
        </div>
        <div className="w-45 flex justify-end gap-2" hidden={isMobile}>
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

          <div className="relative rounded-lg bg-muted py-px px-2">
            <NavLink
              to="sync"
              draggable={false}
              className={({ isActive }) => `
                inline-flex items-center gap-2
                p-0.75 rounded-md
                text-sm font-medium
                transition-all cursor-default

                ${
                  isActive
                    ? "text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              <MonitorSmartphone className="h-4 w-4" />
              Sync
            </NavLink>

            {/* Queued-song count. Positioned absolutely so the fixed-width
                nav row does not reflow when the queue changes. */}
            {queuedSongs.length > 0 && (
              <Badge className="pointer-events-none absolute -top-1.5 -right-1.5 z-10 h-4.5 min-w-4.5 rounded-full px-1 text-[0.65rem] font-semibold tabular-nums">
                {queuedSongs.length > 99 ? "99+" : queuedSongs.length}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet context={{ queryText, activeMode, sort, setSort }} />
      </div>

      {/* In mobile playback mode the playback dock rides above z-50 sheets
          (bottom drawers portal at the root, which shares the root stacking
          context, so a higher sibling z wins) — the album sheet no longer
          covers it. Scoped to playback: edit mode's own editor drawer is
          meant to overlay the dock. */}
      <div
        className={cn("shrink-0", isMobile && activeMode === "playback" && "relative z-[60]")}
        hidden={isSyncPage || (total ?? 0) === 0}
      >
        {activeMode === "edit" && <Editor mode={activeTab as "songs" | "albums" | "artists"} />}

        {activeMode === "playback" && <PlayerControls />}
      </div>

      {/* Mobile primary navigation: icons with the label underneath, pinned
          to the bottom of the viewport — replaces the header tab row, which
          is too small to hit with a thumb. Sync is not offered here (it is a
          desktop-first feature); it stays reachable by URL. */}
      {isMobile && (total ?? 0) > 0 && !isSyncPage && (
        <nav className="relative z-60 shrink-0 border-t bg-secondary supports-backdrop-filter:bg-secondary/60 supports-backdrop-filter:backdrop-blur-lg">
          {/* Frosted bar: the z-50 sheet and its scrim composite under this
              bar, and the backdrop blur makes it visibly slide past on
              open/close. Falls back to an opaque fill where
              backdrop-filter isn't supported. */}
          {/* Search field toggled by the Search button below; sits above the
              button row so the thumb targets never shrink. */}
          {isMobileSearchOpen && (
            <div className="px-2 pb-1">
              <InputGroup className="h-14">
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

          <div className="flex items-stretch justify-around">
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
                    "flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors",
                    isActive ? "text-foreground font-medium" : "text-muted-foreground",
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            <button
              type="button"
              onClick={() => setIsMobileSearchOpen((open) => !open)}
              aria-expanded={isMobileSearchOpen}
              aria-current={isMobileSearchOpen ? "page" : undefined}
              className={cn(
                "flex flex-1 cursor-default flex-col items-center gap-1 py-2 text-xs transition-colors",
                isMobileSearchOpen ? "text-foreground font-medium" : "text-muted-foreground",
              )}
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

export { type MainContext, MainLayout };
