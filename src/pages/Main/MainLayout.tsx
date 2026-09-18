import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSongs } from "@/hooks";
import type { QueryOptions } from "@/lib/store";
import type { Song } from "@/models";
import { Music, DiscAlbum, Search, Pen, Play } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { Outlet, NavLink, useLocation } from "react-router";

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
  mode: "edit" | "playback";
};

function MainLayout() {
  //#region State
  const location = useLocation();
  const activeTab = location.pathname.includes("albums") ? "albums" : "songs";
  const activeMode = location.pathname.includes("playback")
    ? "playback"
    : "edit";
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
          <Tabs className="w-45 flex justify-end">
            <TabsList>
              <TabsTrigger
                value="edit"
                render={
                  <NavLink
                    to={activeTab}
                    draggable="false"
                    className="flex items-center gap-2 cursor-default group"
                  >
                    <Pen className="group-data-active:fill-secondary-foreground group-hover:fill-secondary-foreground fill-muted-foreground" />
                    Edit
                  </NavLink>
                }
              />

              <TabsTrigger
                value="playback"
                render={
                  <NavLink
                    to={`${activeTab}/playback`}
                    draggable="false"
                    className="flex items-center gap-2 cursor-default group"
                  >
                    <Play className="group-data-active:fill-secondary-foreground group-hover:fill-secondary-foreground fill-muted-foreground" />
                    Playback
                  </NavLink>
                }
              />
            </TabsList>
          </Tabs>
        </div>
        <div className="w-full md:w-120">
          <InputGroup className="max-w-xs mx-auto">
            <InputGroupInput
              placeholder="Search..."
              value={queryText}
              onChange={handleFilterTextChange}
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

        <Tabs value={activeTab} className="w-45 flex justify-end">
          <TabsList>
            <TabsTrigger
              value="songs"
              render={
                <NavLink
                  to="/"
                  draggable="false"
                  end
                  className="flex items-center gap-2 cursor-default"
                >
                  <Music className="h-4 w-4" />
                  Songs
                </NavLink>
              }
            ></TabsTrigger>

            <TabsTrigger
              value="albums"
              render={
                <NavLink
                  to="albums"
                  draggable="false"
                  className="flex items-center gap-2 cursor-default"
                >
                  <DiscAlbum className="h-4 w-4" />
                  Albums
                </NavLink>
              }
            ></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-hidden">
        <Outlet context={{ queryText, sort, setSort, mode: activeMode }} />
      </div>
    </div>
  );
}

export { type MainContext, MainLayout };
