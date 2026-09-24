import { useEffect, useMemo, useState } from "react";
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
import { useSongs, usePlayback } from "@/hooks";
import type { Album, Song } from "@/models";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { songDoubleClicked$, songsSelected$ } from "@/events/song-events";
import { isEditMultipleChanged$, songEditSaved$ } from "@/events/editor-events";
import { AlbumDetailDialog } from "../album-detail-dialog";

function Editor({ mode }: { mode: "songs" | "albums" }) {
  //#region Songs
  //#region State
  const { refreshSongs, filteredSongs } = useSongs();
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isAdvancedEdit, setIsAdvancedEdit] = useState<boolean>(false);
  const [isSelectMultiple, setIsSelectMultiple] = useState<boolean>(false);
  const { isPlaying, playPause } = usePlayback();
  //#endregion
  //#region Helpers
  useEffect(() => {
    if (isPlaying) {
      playPause();
    }
  }, [isPlaying, playPause]);
  //#endregion
  //#region Interactivity handlers
  async function handleSongUpdate(updates: Partial<Song>): Promise<void> {
    if (!selectedSongIds) return;
    const selectedSong = selectedSongs[0];
    await applySongEdits(selectedSong, updates);

    songEditSaved$.next(selectedSong);

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
    songsSelected$.next(selectedSongIds);
    setIsAdvancedEdit(false);
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
    songsSelected$.next(selectedSongIds);
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

  function handleEditMultipleChecked(checked: boolean) {
    if (selectedSongIds.length > 1) {
      setSelectedSongIds([]);
    }
    setIsSelectMultiple(checked);
    isEditMultipleChanged$.next(checked);
  }
  //#endregion
  //#endregion

  //#region Albums
  //#region State
  const [selectedAlbum, setSelectedAlbum] = useState<Album | undefined>();
  const albums = useMemo(() => {
    const map = new Map<string, Album>();

    for (const song of filteredSongs) {
      const title = song.album || "Unknown Album";
      const artist = song.artist || "Unknown Artist";
      const key = `${title}-${artist}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          title,
          artist,
          pictureSongId: song.id,
          songs: [song],
        });
      } else {
        map.get(key)!.songs.push(song);
      }
    }

    return Array.from(map.values());
  }, [filteredSongs]);
  //#endregion
  //#region Helpers
  function isAlbumDetailsPrevButtonDisabled(): boolean {
    if (!selectedAlbum) return false;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    return albumIndex === 0;
  }

  function isAlbumDetailsNextButtonDisabled(): boolean {
    if (!selectedAlbum) return false;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    return albumIndex === albumIds.length - 1;
  }
  //#endregion
  //#region Interactivity handlers
  function handleAlbumDetailsPrevClicked() {
    if (!selectedAlbum) return;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    setSelectedAlbum(albums.at(albumIndex - 1));
  }

  function handleAlbumDetailsNextClicked() {
    if (!selectedAlbum) return;

    const albumIds = albums.map((a) => a.id);
    const albumIndex = albumIds.indexOf(selectedAlbum.id);

    setSelectedAlbum(albums.at(albumIndex + 1));
  }

  async function handleAlbumDetailFormSubmit(form: FormData) {
    const result: any = {};

    for (const [key, value] of form.entries()) {
      // Example key: "songs[0].title"
      const path = key.replace(/\]/g, "").split(/\[|\./g);

      let current = result;

      for (let i = 0; i < path.length; i++) {
        const part = path[i];
        const isLast = i === path.length - 1;

        if (isLast) {
          current[part] = value;
        } else {
          const nextPart = path[i + 1];
          const isArrayIndex = /^\d+$/.test(nextPart);

          if (!current[part]) {
            current[part] = isArrayIndex ? [] : {};
          }

          current = current[part];
        }
      }
    }

    for (const song of result.songs) {
      let currentSong = filteredSongs.find((s) => s.id == song.id);

      if (currentSong) {
        const updatedSong: Partial<Song> = {
          ...song,
        };

        if (result.coverFront) {
          updatedSong.coverFront = new Blob([result.coverFront as File]);
        }

        delete updatedSong.id;

        await applySongEdits(currentSong, updatedSong);
        songEditSaved$.next(currentSong);
        backgroundService.enqueue({
          type: "artworkProcess",
          payload: {
            song: {
              ...currentSong,
              ...updatedSong,
            },
          },
        });
      }
    }

    await refreshSongs();
    setIsAdvancedEdit(false);
  }
  //#endregion
  //#endregion

  //#region Interactivity handlers
  function handlePrevClick() {
    if (mode === "songs") {
      const selectedSongIndex = filteredSongs.findIndex(
        (s) => s.id === selectedSongIds[0]
      );

      if (selectedSongIndex === -1) return;

      const prevIndex = Math.max(0, selectedSongIndex - 1);
      const newIds = [filteredSongs[prevIndex].id];

      setSelectedSongIds(newIds);
      songsSelected$.next(newIds);
    }
    if (mode === "albums") {
      if (!selectedAlbum) return;

      const albumIds = albums.map((a) => a.id);
      const index = albumIds.indexOf(selectedAlbum.id);

      if (index <= 0) return;

      const prevAlbum = albums[index - 1];
      const newIds = prevAlbum.songs.map((s) => s.id);

      setSelectedSongIds(newIds);
      songsSelected$.next(newIds);
    }
  }

  function handleNextClick() {
    if (mode === "songs") {
      const selectedSongIndex = filteredSongs.findIndex(
        (s) => s.id === selectedSongIds[0]
      );

      if (selectedSongIndex === -1) return;

      const nextIndex = Math.min(
        filteredSongs.length - 1,
        selectedSongIndex + 1
      );
      const newIds = [filteredSongs[nextIndex].id];

      setSelectedSongIds(newIds);
      songsSelected$.next(newIds);
    }
    if (mode === "albums") {
      if (!selectedAlbum) return;

      const albumIds = albums.map((a) => a.id);
      const index = albumIds.indexOf(selectedAlbum.id);

      if (index >= albumIds.length - 1) return;

      const nextAlbum = albums[index + 1];
      const newIds = nextAlbum.songs.map((s) => s.id);

      setSelectedSongIds(newIds);
      songsSelected$.next(newIds);
    }
  }
  //#endregion
  //#region Subscribe to domain events
  useEffect(() => {
    const subSelected = songsSelected$.subscribe((ids) => {
      setSelectedSongIds(ids);
      const songs = filteredSongs.filter((s) => ids.includes(s.id));
      setSelectedSongs(songs);
      if (mode === "albums") {
        if (!songs[0].album) return;
        setSelectedAlbum(albums.find((a) => a.title == songs[0].album));
      }
    });

    const subDouble = songDoubleClicked$.subscribe((song) => {
      switch (mode) {
        case "albums":
          if (!song.album) return;
          setSelectedAlbum(albums.find((a) => a.title == song.album));
          break;
        case "songs":
          setSelectedSongIds([song.id]);
          setSelectedSongs([song]);
          break;
        default:
          break;
      }
      setIsAdvancedEdit(true);
    });

    return () => {
      subSelected.unsubscribe();
      subDouble.unsubscribe();
    };
  }, [filteredSongs, albums, mode]);
  //#endregion
  return (
    <>
      {selectedSongIds.length > 0 && !isAdvancedEdit && (
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
                  onClick={() => setIsAdvancedEdit(true)}
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

      <Drawer
        open={isAdvancedEdit && mode == "songs"}
        onOpenChange={setIsAdvancedEdit}
      >
        {selectedSongs.length === 1 && (
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
        )}
      </Drawer>
      <AlbumDetailDialog
        open={isAdvancedEdit && mode == "albums"}
        onOpenChange={setIsAdvancedEdit}
        album={selectedAlbum}
        isPrevButtonDisabled={isAlbumDetailsPrevButtonDisabled()}
        isNextButtonDisabled={isAlbumDetailsNextButtonDisabled()}
        handlePrevClick={handleAlbumDetailsPrevClicked}
        handleNextClick={handleAlbumDetailsNextClicked}
        onSubmit={handleAlbumDetailFormSubmit}
      />
    </>
  );
}

export { Editor };
