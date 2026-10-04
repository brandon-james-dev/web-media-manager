import { PlayerControls } from "@/components/player-controls";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSongs } from "@/hooks";
import type { QueryOptions } from "@/lib/store";
import type { Song } from "@/models";
import { Music, DiscAlbum, Search, Pen, MonitorSmartphone } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import {
  Outlet,
  NavLink,
  useLocation,
  useParams,
  useNavigate,
} from "react-router";
import { Editor } from "@/components/editor";
import { Toggle } from "@/components/ui/toggle";

type MainContext = {
  queryText: string;
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
  const navigate = useNavigate();

  const isSyncPage = pathname.startsWith("/sync");

  const activeTab = isSyncPage
    ? "sync"
    : pathname.includes("albums")
      ? "albums"
      : "songs";

  const activeMode = isSyncPage
    ? undefined
    : mode === "edit"
      ? "edit"
      : "playback";

  const routeMode = activeMode ?? "playback";

  const { query, setQuery, total, filteredTotal } = useSongs();

  const [sort, setSort] = useState<{
    selector: (item: Song) => any;
    desc: boolean;
  }>();

  const [queryText, setQueryText] = useState<string>("");
  //#endregion

  //#region Interactivity Handlers
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
        song.artist?.toLowerCase().includes(text.toLowerCase()),
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
        <div className="w-full md:w-120">
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
              <InputGroupAddon align="inline-end">
                {filteredTotal} results
              </InputGroupAddon>
            )}
          </InputGroup>
        </div>
        <div className="w-45 flex justify-end gap-2">
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
            </TabsList>
          </Tabs>

          <div className="rounded-lg bg-muted py-px px-2">
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
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet context={{ queryText, sort, setSort }} />
      </div>

      <div className="shrink-0" hidden={isSyncPage || (total ?? 0) === 0}>
        {activeMode === "edit" && (
          <Editor mode={activeTab as "songs" | "albums"} />
        )}

        {activeMode === "playback" && <PlayerControls />}
      </div>
    </div>
  );
}

export { type MainContext, MainLayout };
