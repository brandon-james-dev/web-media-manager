import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { isApiSupported, showDirectoryPicker } from "use-fs-access/core";
import { Music, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { addPersistedStoreDirectory, getMetadataStore } from "@/lib";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { backgroundService } from "@/lib/background-jobs";
import { selectors, type QueryOptions, type SortableColumn } from "@/lib/store";
import { useSongs } from "@/providers";
import type { WorkerProgress } from "@/workers";
import type { Directory, Song } from "@/models";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TanstackSongTable } from "@/components/song-table";
import { Outlet, useOutletContext } from "react-router";
import type { MainContext } from "./MainLayout";

type SongsContext = {
  songs: Song[];
  filteredSongs: Song[];
  selectedSongIds: string[];
  setSelectedSongIds: Dispatch<SetStateAction<string[]>>;
  isSelectMultiple: boolean;
  setIsSelectMultiple: Dispatch<SetStateAction<boolean>>;
  isSongsTableVisible: boolean;
  setIsSongsTableVisible: Dispatch<SetStateAction<boolean>>;
};

function Songs() {
  //#region State
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isSelectMultiple, setIsSelectMultiple] = useState<boolean>(false);
  const [isSongsTableVisible, setIsSongsTableVisible] = useState<boolean>(true);
  const { songs, filteredSongs, query, setQuery } = useSongs();
  const { sort, setSort } = useOutletContext<MainContext>();
  const [songSort] = useState<{
    selector: (song: Song) => void;
    desc: boolean;
  }>({
    selector: (song: Song) => song.album,
    desc: false,
  });
  const noDirectories = directories.length === 0;
  //#endregion

  //#region Global event handlers
  useEffect(() => {
    setQuery({ sort: songSort });
    setSort(songSort);
  }, [setQuery, setSort, songSort]);

  useEffect(() => {
    const unsub = backgroundService.onJobProgress(async (job) => {
      if (job.jobType !== "bulkImport") return;
      const jobProgress = job.payload as WorkerProgress;

      if ((jobProgress?.total ?? 0) == 0) {
        return;
      }

      const toastOptions = {
        id: "import-progress",
        title: "Importing songs…",
        description: (
          <div className="flex flex-col gap-2">
            <div>
              {jobProgress.index ?? 0 + 1} / {jobProgress.total ?? 0}
            </div>
            <Progress value={(jobProgress.percent ?? 0) * 100} />
          </div>
        ),
      };

      toast.add(toastOptions);
    });

    const unsubDone = backgroundService.onJobCompleted((job) => {
      if (job.type !== "bulkImport") return;

      toast.update("import-progress", {
        title: "Import complete",
        timeout: 5000,
      });
    });

    return () => {
      unsub();
      unsubDone();
    };
  }, []);
  //#endregion

  //#region Helpers
  async function refresh() {
    const store = getMetadataStore() as CombinedMetadataStore;
    // For some reason the directory added event comes too early
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
  //#endregion

  //#region Interactivity handlers
  async function handlePickDirectory() {
    if (!isApiSupported) {
      throw new Error("File System Access API not supported.");
    }

    const dirHandle = await showDirectoryPicker({ mode: "readwrite" });
    if (!dirHandle) return;

    addPersistedStoreDirectory(dirHandle);

    backgroundService.enqueue({
      type: "bulkImport",
      payload: { directoryHandle: dirHandle },
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

  function handleSongsSelected(selectedSongIds: string[]) {
    setSelectedSongIds(selectedSongIds);
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
              <Plus className="h-5 w-5" />
              Select a directory…
            </Button>
          </Card>
        </div>
      )}
      {!noDirectories && isSongsTableVisible && (
        <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
          <TanstackSongTable
            songs={filteredSongs}
            selectedSongIds={selectedSongIds}
            isEditMultiple={isSelectMultiple}
            onSelect={handleSongsSelected}
            onSort={handleSort}
            sort={sort}
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      <Outlet
        context={{
          songs,
          filteredSongs,
          selectedSongIds,
          setSelectedSongIds,
          isSelectMultiple,
          setIsSelectMultiple,
          isSongsTableVisible,
          setIsSongsTableVisible,
        }}
      />
    </div>
  );
}

export { Songs, type SongsContext };
