import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Outlet, useOutletContext } from "react-router";
import { isApiSupported, showDirectoryPicker } from "use-fs-access/core";
import { FolderOpen, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TanstackSongTable } from "@/components/song-table";
import { addPersistedStoreDirectory, getMetadataStore } from "@/lib";
import { backgroundService } from "@/lib/background-jobs";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { selectors, type QueryOptions, type SortableColumn } from "@/lib/store";
import { useSongs } from "@/providers";
import type { Directory, Song } from "@/models";
import { usePlayback } from "@/hooks";
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
  const progressRef = useRef({
    bulk: { totalSongs: 0, importedSongs: 0 },
    artwork: { totalPictures: 0, completedPictures: 0 },
  });
  const noDirectories = directories.length === 0;
  //#endregion

  //#region Global event handlers
  useEffect(() => {
    setQuery({ sort: songSort });
    setSort(songSort);
  }, [setQuery, setSort, songSort]);

  useEffect(() => {
    let bulkPct = 0;

    let artworkPct = 0;

    const unsub = backgroundService.onJobProgress((job) => {
      const p = job.payload;

      if (job.jobType === "bulkImport") {
        const { index, total, data } = p;

        progressRef.current = {
          bulk: {
            totalSongs: total,
            importedSongs: index + 1,
          },
          artwork: {
            ...progressRef.current.artwork,
            totalPictures: data.totalPictureCount,
          },
        };
      }

      if (job.jobType === "artworkProcess") {
        if (job.payload?.data?.artworkId) {
          progressRef.current = {
            ...progressRef.current,
            artwork: {
              ...progressRef.current.artwork,
              completedPictures:
                progressRef.current.artwork.completedPictures + 1,
            },
          };
        }
      }

      bulkPct =
        progressRef.current.bulk.totalSongs > 0
          ? progressRef.current.bulk.importedSongs /
            progressRef.current.bulk.totalSongs
          : 0;

      artworkPct =
        progressRef.current.artwork.totalPictures > 0
          ? progressRef.current.artwork.completedPictures /
            progressRef.current.artwork.totalPictures
          : 0;

      toast.add({
        id: "import-progress",
        title: "Importing songs…",
        description: (
          <div className="flex flex-col gap-2">
            <div>
              {`Songs: ${progressRef.current.bulk.importedSongs} / ${progressRef.current.bulk.totalSongs}`}
            </div>
            <Progress value={bulkPct * 100} />
            <div>
              {`Thumbnails: ${progressRef.current.artwork.completedPictures} / ${progressRef.current.artwork.totalPictures}`}
            </div>
            <Progress value={artworkPct * 100} />
          </div>
        ),
      });
    });

    if (artworkPct === 1 && bulkPct === 1) {
      toast.add({
        id: "import-progress",
        title: "Import complete",
        description: <></>,
        timeout: 5000,
      });
    }

    return () => {
      unsub();
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

  const { setPlaylist, setNowPlaying } = usePlayback();
  const { mode } = useOutletContext<MainContext>();

  function handleSongDoubleClicked(song: Song) {
    if (mode == "playback") {
      const index = filteredSongs.indexOf(song);
      setPlaylist([...filteredSongs.slice(index)]);
      setNowPlaying(song);
    }
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
      {!noDirectories && isSongsTableVisible && (
        <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
          <TanstackSongTable
            songs={filteredSongs}
            selectedSongIds={selectedSongIds}
            isEditMultiple={isSelectMultiple}
            onSelect={handleSongsSelected}
            onSort={handleSort}
            sort={sort}
            onSongDoubleClicked={handleSongDoubleClicked}
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
