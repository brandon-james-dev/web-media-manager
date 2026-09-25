import { useEffect, useState } from "react";
import { useOutletContext } from "react-router";
import { isApiSupported, showDirectoryPicker } from "use-fs-access/core";
import { FolderOpen, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TanstackSongTable } from "@/components/song-table";
import { addPersistedStoreDirectory, getMetadataStore } from "@/lib";
import { backgroundService } from "@/lib/background-jobs";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { selectors, type QueryOptions, type SortableColumn } from "@/lib/store";
import { useSongs } from "@/providers";
import type { Directory, Song } from "@/models";
import type { MainContext } from "./MainLayout";
import { songDoubleClicked$, songsSelected$ } from "@/events/song-events";
import { isEditMultipleChanged$ } from "@/events/editor-events";

function Songs() {
  //#region State
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isEditMultiple, setIsEditMultiple] = useState<boolean>(false);

  const { filteredSongs, query, setQuery } = useSongs();
  const { sort, setSort } = useOutletContext<MainContext>();

  const [songSort] = useState({
    selector: (song: Song) => song.album,
    desc: false,
  });

  const noDirectories = directories.length === 0;
  //#endregion

  //#region Subscribe to domain events
  useEffect(() => {
    setQuery({ sort: songSort });
    setSort(songSort);
  }, [setQuery, setSort, songSort]);
  //#endregion

  //#region Helpers
  async function refresh() {
    const store = getMetadataStore() as CombinedMetadataStore;
    await new Promise((resolve) => setTimeout(resolve, 250));
    const dirs = await store.getDirectories();
    setDirectories(dirs);
  }

  useEffect(() => {
    const store = getMetadataStore() as CombinedMetadataStore;

    store.getDirectories().then(setDirectories);

    const unsubDirAdded = store.onDirectoryAdded(refresh);
    const unsubSongsCleared = store.onStoreCleared(refresh);

    return () => {
      unsubDirAdded();
      unsubSongsCleared();
    };
  }, []);

  useEffect(() => {
    const subSelected = songsSelected$.subscribe((ids) => {
      setSelectedSongIds(ids);
    });
    const subEditMultiple = isEditMultipleChanged$.subscribe(
      (currentIsEditMultiple) => {
        setIsEditMultiple(currentIsEditMultiple);
      }
    );

    return () => {
      subSelected.unsubscribe();
      subEditMultiple.unsubscribe();
    };
  }, [filteredSongs]);
  //#endregion

  //#region Interactivity handlers
  async function handlePickDirectory() {
    if (!isApiSupported)
      throw new Error("File System Access API not supported.");

    const dirHandle = await showDirectoryPicker({ mode: "readwrite" });
    if (!dirHandle) return;

    const directory = await addPersistedStoreDirectory(dirHandle);

    backgroundService.enqueue({
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
    songsSelected$.next(ids);
  }

  function handleSongDoubleClicked(song: Song) {
    songDoubleClicked$.next(song);
  }
  //#endregion

  return (
    <div className="h-full w-full flex flex-col">
      {noDirectories && (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-10 flex flex-col items-center gap-6">
            <Music color="var(--accent)" size={48} />
            <h1 className="text-3xl font-bold">Add Music</h1>
            <Button
              onClick={handlePickDirectory}
              className="flex items-center gap-2"
            >
              <FolderOpen className="h-5 w-5" />
              Select a directory…
            </Button>
          </Card>
        </div>
      )}

      {!noDirectories && (
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
    </div>
  );
}

export { Songs };
