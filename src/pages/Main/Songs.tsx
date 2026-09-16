import { useEffect, useState } from "react";
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
import { SongEditForm } from "@/components/song-edit-form/SongEditForm";
import { QuickEditForm } from "@/components/quick-edit-form/QuickEditForm";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TanstackSongTable } from "@/components/song-table";
import { useOutletContext } from "react-router";
import type { MainContext } from "./MainLayout";

export default function Songs() {
  //#region State
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  const [isEditMultiple, setIsEditMultiple] = useState<boolean>(false);
  const { songs, filteredSongs, query, setQuery, refreshSongs } = useSongs();
  const { sort, setSort } = useOutletContext<MainContext>();
  const selectedSongs = songs.filter((s) => selectedSongIds.includes(s.id));
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
      type: "bulkImport",
      payload: { directoryHandle: dirHandle },
    });

    await refresh();
  }

  async function handleSongUpdate(updates: Partial<Song>): Promise<void> {
    if (!selectedSongIds) return;
    const selectedSong = selectedSongs[0];
    await applySongEdits(selectedSong, updates);
    backgroundService.enqueue({
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
    setSelectedSongIds([]);
    await refreshSongs();
    setIsFormVisible(false);
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

  async function handleApply(updates: Partial<Song>) {
    if (selectedSongs.length == 0) return;

    if (selectedSongs.length === 1) {
      await applySongEdits(selectedSongs[0], updates);

      toast.add({
        type: "success",
        title: `Updated "${selectedSongs[0].title}"`,
      });
    } else {
      backgroundService.enqueue({
        type: "bulkEdit",
        payload: {
          songIds: selectedSongIds,
          edits: updates,
        },
      });

      toast.add({
        type: "info",
        title: `Bulk edit started (${selectedSongs.length} songs)`,
      });
    }

    setSelectedSongIds([]);
  }

  function isPrevButtonDisabled() {
    const selectedSongIndex = filteredSongs.findIndex(
      (s) => s.id === selectedSongIds[0]
    );
    return selectedSongIndex === 0;
  }

  function isNextButtonDisabled() {
    const selectedSongIndex = filteredSongs.findIndex(
      (s) => s.id === selectedSongIds[0]
    );
    return selectedSongIndex === filteredSongs.length - 1;
  }

  function handlePrevClick() {
    const selectedSongIndex = filteredSongs.findIndex(
      (s) => s.id === selectedSongIds[0]
    );

    if (selectedSongIndex === -1) return;

    const prevIndex = Math.max(0, selectedSongIndex - 1);
    setSelectedSongIds([filteredSongs[prevIndex]].map((s) => s.id));
  }

  function handleNextClick() {
    const selectedSongIndex = filteredSongs.findIndex(
      (s) => s.id === selectedSongIds[0]
    );

    if (selectedSongIndex === -1) return;

    const nextIndex = Math.min(filteredSongs.length - 1, selectedSongIndex + 1);
    setSelectedSongIds([filteredSongs[nextIndex]].map((s) => s.id));
  }

  function handleEditMultipleChecked(checked: boolean) {
    if (selectedSongIds.length > 1) {
      setSelectedSongIds([]);
    }
    setIsEditMultiple(checked);
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
        <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto">
          <TanstackSongTable
            songs={filteredSongs}
            selectedSongIds={selectedSongIds}
            isEditMultiple={isEditMultiple}
            onSelect={handleSongsSelected}
            onSort={handleSort}
            sort={sort}
          />
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
      {selectedSongIds.length > 0 && !isFormVisible && (
        <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
          <div className="max-w-240 mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">
                  Quick Edit
                  {isEditMultiple && (
                    <span className="pl-1">
                      ({selectedSongIds.length} selected)
                    </span>
                  )}
                </h3>

                {!isEditMultiple && (
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
                <Button size="sm" variant="outline">
                  <Label htmlFor="is-multi-edit">
                    <Checkbox
                      id="is-multi-edit"
                      checked={isEditMultiple}
                      onCheckedChange={handleEditMultipleChecked}
                    />
                    Edit Multiple
                  </Label>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsFormVisible(true)}
                  disabled={isEditMultiple}
                >
                  <PencilRuler />
                  Advanced Edit
                </Button>

                <Button
                  size="sm"
                  variant="default"
                  type="submit"
                  form="quick-edit-form"
                  className="bg-accent/50 hover:bg-accent/70 text-white"
                >
                  <Save />
                  Save
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSongIds([])}
                >
                  <X />
                  Close
                </Button>
              </div>
            </div>

            <QuickEditForm
              formId="quick-edit-form"
              songs={selectedSongs}
              onApply={handleApply}
            />
          </div>
        </div>
      )}

      {selectedSongIds.length === 1 && (
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
