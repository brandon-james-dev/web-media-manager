import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { isApiSupported, showDirectoryPicker } from "use-fs-access/core";
import { FolderOpen, Loader2, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TanstackSongTable } from "@/components/song-table";
import { addFolder } from "@/core/scanning";
import { getStore } from "@/core/system";
import { getJobService } from "@/core/jobs";
import { wmmBus } from "@/core/events";
import { selectors, type QueryOptions, type SortableColumn } from "@/lib/persistence";
import { useSongs } from "@/hooks";
import type { MusicSource, Song } from "@/models";
import type { MainContext } from "./MainLayout";

function Songs() {
  //#region State
  const [musicSources, setMusicSources] = useState<MusicSource[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isEditMultiple, setIsEditMultiple] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { filteredSongs, query, setQuery } = useSongs();
  const { sort, setSort } = useOutletContext<MainContext>();

  const [songSort] = useState({
    selector: (song: Song) => song.title,
    desc: false,
  });

  const noMusicSources = musicSources.length === 0;
  //#endregion

  //#region Subscribe to domain events
  useEffect(() => {
    setQuery({ sort: songSort });
    setSort(songSort);
  }, [setQuery, setSort, songSort]);
  //#endregion

  //#region Helpers
  async function refresh() {
    const store = getStore();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const sources = await store.getSources();
    setMusicSources(sources);
  }

  useEffect(() => {
    const store = getStore();

    store.getSources().then((next) => {
      setMusicSources(next);
      setIsLoading(false);
    });

    const unsubDirAdded = store.onSourceAdded(refresh);
    const unsubSongsCleared = store.onStoreCleared(refresh);

    return () => {
      unsubDirAdded();
      unsubSongsCleared();
    };
  }, []);

  useEffect(() => {
    const subSelected = wmmBus.on("wmm.ui.selectionChanged", (payload) => {
      setSelectedSongIds(payload?.songIds ?? []);
    });
    const subEditMultiple = wmmBus.on("wmm.ui.editorModeChanged", (payload) => {
      setIsEditMultiple(payload?.mode === "edit");
    });

    return () => {
      subSelected();
      subEditMultiple();
    };
  }, [filteredSongs]);
  //#endregion

  //#region Interactivity handlers
  async function handlePickMusicSource() {
    if (!isApiSupported)
      throw new Error("File System Access API not supported.");

    const dirHandle = await showDirectoryPicker({ mode: "readwrite" });
    if (!dirHandle) return;

    const directory = await addFolder(dirHandle);

    getJobService().enqueue({
      type: "Bulk Import",
      payload: { directory },
    });

    await refresh();
  }

  function handleSort(column: SortableColumn) {
    const selector = selectors[column];
    const isSame = sort?.selector === selector;

    const nextSort = {
      selector,
      desc: isSame ? !sort?.desc : false,
    };

    setSort(nextSort);

    const nextQuery: QueryOptions<Song> = {
      ...query,
      sort: nextSort,
      filter: query.filter,
      skip: 0,
      page: 0,
    };

    setQuery(nextQuery);
  }

  function handleSongsSelected(ids: string[]) {
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: ids });
  }

  function handleSongDoubleClicked(song: Song) {
    wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
  }
  //#endregion

  return (
    <div className="h-full w-full flex flex-col">
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-full w-full">
          <span>
            <Loader2 className="inline-block animate-spin" /> Loading…
          </span>
        </div>
      ) : (
        <>
          {noMusicSources && (
            <div className="flex-1 flex items-center justify-center">
              <Card className="p-10 flex flex-col items-center gap-6">
                <Music color="var(--accent)" size={48} />
                <h1 className="text-3xl font-bold">Add Music</h1>
                <Button
                  onClick={handlePickMusicSource}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="h-5 w-5" />
                  Select a directory…
                </Button>
              </Card>
            </div>
          )}

          {!noMusicSources && (
            <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
              <TanstackSongTable
                songs={filteredSongs}
                selectedSongIds={selectedSongIds}
                isEditMultiple={isEditMultiple}
                onSelect={handleSongsSelected}
                onSort={handleSort}
                sort={sort}
                onSongDoubleClicked={handleSongDoubleClicked}
              />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </>
      )}
    </div>
  );
}

export { Songs };
