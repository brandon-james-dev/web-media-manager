import "./Main.css";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music, Plus } from "lucide-react";
import {
  addPersistedStoreDirectory,
  applySongEdits,
  getMetadataStore,
} from "@/lib";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import type { Directory, Song } from "@/models";
import { isApiSupported, showDirectoryPicker } from "use-fs-access/core";
import { backgroundService } from "@/lib/background-jobs";
import { uuidv7 } from "uuidv7";
import { SongTable } from "@/components/SongTable";
import { useSongs } from "@/providers";
import { toast } from "@/components/ui/toast";
import { Progress } from "@/components/ui/progress";
import type { WorkerProgress } from "@/workers";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { SongEditForm } from "@/components/SongEditForm";

export default function HomePage() {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const { songs } = useSongs();
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

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

  async function refresh() {
    const store = getMetadataStore() as CombinedMetadataStore;
    // For some reason the directory added event comes too early
    await new Promise((resolve) => setTimeout(resolve, 250));
    const dirs = await store.getDirectories();
    setDirectories(dirs);
  }

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

  async function onSongUpdate(updates: Partial<Song>): Promise<void> {
    if (!selectedSong) return;
    await applySongEdits(selectedSong, updates);
    toast.add({
      type: "success",
      title: `"${selectedSong.title}" was updated`,
    });
    setSelectedSong(null);
  }

  const noDirectories = directories.length === 0;

  return (
    <div className="h-full w-full flex flex-col">
      {noDirectories && (
        <div className="flex-1 flex items-center justify-center">
          <Card className="p-10 flex flex-col items-center gap-6">
            <Music size={48} />
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

      {!noDirectories && <SongTable songs={songs} onSelect={setSelectedSong} />}
      <Drawer open={!!selectedSong} onOpenChange={() => setSelectedSong(null)}>
        <DrawerContent className="p-6">
          {selectedSong && (
            <>
              <DrawerHeader className="select-none">
                <DrawerTitle>{selectedSong.filename}</DrawerTitle>
                <DrawerDescription>
                  Update the metadata for the selected song
                </DrawerDescription>
              </DrawerHeader>

              <div className="p-6 overflow-y-auto">
                <SongEditForm
                  formId="song-edit-form"
                  song={selectedSong}
                  onFormSubmit={onSongUpdate}
                />
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
