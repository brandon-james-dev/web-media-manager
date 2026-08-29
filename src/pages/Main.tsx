import "./Main.css";

import { useEffect, useState, type ChangeEvent } from "react";
import { uuidv7 } from "uuidv7";
import { isApiSupported, showDirectoryPicker } from "use-fs-access/core";
import {
  ChevronLeft,
  ChevronRight,
  Music,
  PencilRuler,
  Plus,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { SongEditForm } from "@/components/song-edit-form/SongEditForm";
import { QuickEditForm } from "@/components/quick-edit-form/QuickEditForm";
import { SongTable } from "@/components/song-table/SongTable";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  addPersistedStoreDirectory,
  applySongEdits,
  getMetadataStore,
} from "@/lib";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { backgroundService } from "@/lib/background-jobs";
import { selectors, type QueryOptions, type SortableColumn } from "@/lib/store";
import { useSongs } from "@/providers";
import type { WorkerProgress } from "@/workers";
import type { Directory, Song } from "@/models";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export default function Main() {
  //#region State
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [queryText, setQueryText] = useState<string>("");
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isMultiEdit, setIsMultiEdit] = useState<boolean>(false);
  const [sort, setSort] = useState<{
    selector: (item: Song) => any;
    desc: boolean;
  }>();
  const { songs, query, setQuery } = useSongs();

  const noDirectories = directories.length === 0;
  //#endregion

  //#region Global event handlers
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
      id: uuidv7(),
      type: "bulkImport",
      state: "pending",
      payload: { directoryHandle: dirHandle },
    });

    refresh();
  }

  async function handleSongUpdate(updates: Partial<Song>): Promise<void> {
    if (!selectedSongs) return;
    const selectedSong = selectedSongs[0];
    await applySongEdits(selectedSong, updates);
    backgroundService.enqueue({
      id: uuidv7(),
      state: "pending",
      type: "artworkProcess",
      payload: {
        song: {
          ...selectedSong,
          ...updates,
        },
      },
    });
    toast.add({
      type: "success",
      title: `"${selectedSong.title}" was updated`,
    });
    setSelectedSongs([]);
    setIsFormVisible(false);
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
        song.artist?.toLowerCase().includes(text.toLowerCase()),
    } as QueryOptions<Song>;

    setQuery(textQuery);
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

  function handleSongSelected(song: Song) {
    setSelectedSongs((prev) => {
      const exists = prev.some((s) => s.id == song.id);

      if (!isMultiEdit) {
        return exists ? [] : [song];
      }

      if (exists) {
        return prev.filter((s) => s.id != song.id);
      }

      return [...prev, song];
    });
  }

  async function handleApply(updates: Partial<Song>) {
    for (const song of selectedSongs) {
      await applySongEdits(song, updates);
    }
    setSelectedSongs([]);
    toast.add({
      type: "success",
      title: `Updated ${selectedSongs.length} songs`,
    });
  }

  function isPrevButtonDisabled() {
    const selectedSong = selectedSongs[0];
    const selectedSongIndex = songs.findIndex((s) => s.id === selectedSong.id);

    return selectedSongIndex === 0;
  }

  function isNextButtonDisabled() {
    const selectedSong = selectedSongs[0];
    const selectedSongIndex = songs.findIndex((s) => s.id === selectedSong.id);

    return selectedSongIndex === songs.length - 1;
  }

  function handlePrevClick() {
    const selectedSong = selectedSongs[0];
    const selectedSongIndex = songs.findIndex((s) => s.id === selectedSong.id);

    if (selectedSongIndex === -1) return;

    const prevIndex = Math.max(0, selectedSongIndex - 1);
    setSelectedSongs([songs[prevIndex]]);
  }

  function handleNextClick() {
    const selectedSong = selectedSongs[0];
    const selectedSongIndex = songs.findIndex((s) => s.id === selectedSong.id);

    if (selectedSongIndex === -1) return;

    const nextIndex = Math.min(songs.length - 1, selectedSongIndex + 1);
    setSelectedSongs([songs[nextIndex]]);
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
      {!noDirectories && (
        <>
          <div className="flex justify-center p-4">
            <div className="w-full md:w-120">
              <Input
                placeholder="Filter…"
                value={queryText}
                onChange={handleFilterTextChange}
                autoComplete="false"
                autoCorrect="false"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
            <SongTable
              songs={songs}
              selectedSongs={selectedSongs}
              onSelect={handleSongSelected}
              onSort={handleSort}
              sort={sort}
            />
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </>
      )}
      {selectedSongs.length > 0 && !isFormVisible && (
        <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
          <div className="max-w-240 mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">Quick Edit</h3>

                {!isMultiEdit && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrevClick}
                      disabled={isPrevButtonDisabled()}
                    >
                      <ChevronLeft />
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleNextClick}
                      disabled={isNextButtonDisabled()}
                    >
                      Next
                      <ChevronRight />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsFormVisible(true)}
                  disabled={isMultiEdit}
                >
                  <PencilRuler />
                  Advanced Edit
                </Button>

                <Button
                  size="sm"
                  variant="default"
                  type="submit"
                  form="quick-edit-form"
                  className="bg-accent hover:bg-accent/70 text-white"
                >
                  <Save />
                  Save
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSongs([])}
                >
                  <X />
                  Close
                </Button>
              </div>
            </div>

            <QuickEditForm
              formId="quick-edit-form"
              songs={songs.filter((s) => selectedSongs.includes(s))}
              onApply={handleApply}
            />
          </div>
        </div>
      )}

      {selectedSongs.length === 1 && (
        <Drawer open={!!isFormVisible} onOpenChange={setIsFormVisible}>
          <DrawerContent className="p-6">
            <DrawerHeader className="select-none">
              <DrawerTitle>{selectedSongs[0].filename}</DrawerTitle>
              <DrawerDescription>
                Update the metadata for the selected song
              </DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto">
              <SongEditForm
                song={selectedSongs[0]}
                onFormSubmit={handleSongUpdate}
              />
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
