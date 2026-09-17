import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  PencilRuler,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { SongEditForm } from "@/components/song-edit-form/SongEditForm";
import { QuickEditForm } from "@/components/quick-edit-form/QuickEditForm";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { applySongEdits } from "@/lib";
import { backgroundService } from "@/lib/background-jobs";
import { useSongs } from "@/providers";
import type { Song } from "@/models";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useOutletContext } from "react-router";
import { type SongsContext } from "./Songs";

function SongEdit() {
  //#region State
  const { refreshSongs } = useSongs();
  const {
    songs,
    filteredSongs,
    selectedSongIds,
    setSelectedSongIds,
    isSelectMultiple,
    setIsSelectMultiple,
  } = useOutletContext<SongsContext>();
  const selectedSongs = songs.filter((s) => selectedSongIds.includes(s.id));
  const [isFormVisible, setIsFormVisible] = useState<boolean>(false);
  //#endregion

  //#region Interactivity handlers
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
    await refreshSongs();
    setSelectedSongIds([selectedSong.id]);
    setIsFormVisible(false);
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
    setIsSelectMultiple(checked);
  }
  //#endregion

  return (
    <>
      {selectedSongIds.length > 0 && !isFormVisible && (
        <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
          <div className="max-w-240 mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">
                  Quick Edit
                  {isSelectMultiple && (
                    <span className="pl-1">
                      ({selectedSongIds.length} selected)
                    </span>
                  )}
                </h3>

                {!isSelectMultiple && (
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
                      checked={isSelectMultiple}
                      onCheckedChange={handleEditMultipleChecked}
                    />
                    Edit Multiple
                  </Label>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsFormVisible(true)}
                  disabled={isSelectMultiple}
                >
                  <PencilRuler />
                  Advanced Edit
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  type="reset"
                  form="quick-edit-form"
                  className="border-accent/50 hover:border-accent/70 text-white"
                >
                  <Eraser />
                  Reset
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
        <Drawer open={isFormVisible} onOpenChange={setIsFormVisible}>
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
    </>
  );
}

export { SongEdit };
