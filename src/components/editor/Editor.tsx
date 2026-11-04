import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  PencilRuler,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SongEditForm } from "@/components/song-edit-form/SongEditForm";
import { PreviewButton } from "./PreviewButton";
import { QuickEditForm } from "@/components/quick-edit-form/QuickEditForm";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { updateTags } from "@/core/metadata";
import type { AlbumDetailDto, QuickEditDto, SongEditDto } from "@/dto";
import { getJobService } from "@/core/jobs";
import { commandDispatcher, wmmBus } from "@/events";
import { useSongs, usePlayback } from "@/hooks";
import { useSourceEditable } from "@/lib/hooks/useSourceEditable";
import type { Album, Song } from "@/models";
import { AlbumDetailDialog } from "../album-detail-dialog";
import { keyShortcut$ } from "@/events/keyboard-events";
import { notification$ } from "@/events/notification-events";
import { uuidv7 } from "uuidv7";

export function Editor({ mode }: { mode: "songs" | "albums" | "artists" }) {
  //#region Songs
  //#region State
  const { filteredSongs } = useSongs();
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isAdvancedEdit, setIsAdvancedEdit] = useState<boolean>(false);
  // Which advanced dialog `isAdvancedEdit` refers to. The song drawer and the
  // album dialog share one open flag, so the artist view (which can open
  // either) distinguishes them here; other modes are unchanged.
  const [advancedDialog, setAdvancedDialog] = useState<"song" | "album">("song");
  function openAdvancedEdit(target: "song" | "album") {
    setAdvancedDialog(target);
    setIsAdvancedEdit(true);
  }
  const [quickDirty, setQuickDirty] = useState(false);
  const editable = useSourceEditable(selectedSongs);
  const { isPlaying } = usePlayback();
  //#endregion
  //#region Helpers
  // Pause playback once when the editor mounts (entering edit mode stops the
  // music IF it's playing). This must NOT re-fire on every isPlaying change —
  // keying the toggle to isPlaying flips would pause playback right after it
  // starts (the self-pause bug: resume -> isPlaying true -> effect toggles
  // pause). Use a ref to read the mount-time state without re-running.
  const mountPauseRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !mountPauseRef.current) {
      mountPauseRef.current = true;
      wmmBus.invoke("wmm.playback.playpause");
    }
  }, [isPlaying]);
  //#endregion
  //#region Interactivity handlers
  async function handleSongUpdate(updates: SongEditDto): Promise<void> {
    if (!selectedSongIds) return;
    const selectedSong = selectedSongs[0];
    const cover = updates.coverFront
      ? { coverFront: updates.coverFront }
      : undefined;
    const editUpdates: Partial<Song> = {};
    for (const [k, v] of Object.entries(updates) as [keyof SongEditDto, unknown][]) {
      if (k === "coverFront") continue;
      if (v !== undefined) (editUpdates as Record<string, unknown>)[k] = v;
    }
    const updatedSong = await updateTags(selectedSong, editUpdates, cover);
    notification$.next({
      id: uuidv7(),
      title: "Song Updated",
      detail: `Updated "${updatedSong.title} - ${updatedSong.artist}"`,
      state: "completed",
      kind: "Song Edit",
    });

    wmmBus.publish("wmm.library.song.updated", { songId: selectedSong.id });

    getJobService().enqueue({
      type: "Thumbnail Generation",
      payload: {
        song: {
          ...selectedSong,
          ...editUpdates,
        },
      },
    });

    setSelectedSongIds([selectedSong.id]);
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: selectedSongIds });
    setIsAdvancedEdit(false);
  }

  async function handleApply(updates: QuickEditDto) {
    if (selectedSongs.length == 0) return;

    const editUpdates: Partial<Song> = {};
    if (updates.title !== undefined) editUpdates.title = updates.title;
    if (updates.artist !== undefined) editUpdates.artist = updates.artist;
    if (updates.album !== undefined) editUpdates.album = updates.album;
    if (updates.genre !== undefined) editUpdates.genre = updates.genre;
    if (updates.year !== undefined) editUpdates.year = updates.year;
    if (updates.track !== undefined) editUpdates.track = updates.track;
    const cover = updates.coverFront
      ? { coverFront: updates.coverFront }
      : undefined;

    if (selectedSongs.length === 1) {
      const updatedSong = await updateTags(selectedSongs[0], editUpdates, cover);

      notification$.next({
        id: uuidv7(),
        title: "Song Updated",
        detail: `Updated "${updatedSong.title} - ${updatedSong.artist}"`,
        state: "completed",
        kind: "Song Edit",
      });
    } else {
      getJobService().enqueue({
        type: "Bulk Edit",
        payload: {
          songIds: selectedSongIds,
          edits: editUpdates,
        },
      });
    }

    setSelectedSongIds([]);
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: selectedSongIds });
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

  /**
   * The list prev/next navigate for the song editor: the artist's own
   * tracks on the artist page, the full filtered list elsewhere. Shared by
   * the handlers and the disabled checks so the buttons match the behavior.
   */
  function songNavList(): Song[] {
    return mode === "artists" ? artistSongContext() : filteredSongs;
  }

  /** Prev disabled when the selected song is the first in the nav list. */
  function isSongPrevButtonDisabled(): boolean {
    const list = songNavList();
    const idx = list.findIndex((s) => s.id === selectedSongIds[0]);
    return idx <= 0;
  }

  /** Next disabled when the selected song is the last in the nav list. */
  function isSongNextButtonDisabled(): boolean {
    const list = songNavList();
    const idx = list.findIndex((s) => s.id === selectedSongIds[0]);
    return idx === -1 || idx === list.length - 1;
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

  /**
   * The song navigation list for the artist page: the songs surrounding the
   * current one (its album when resolvable, else the full filtered list), so
   * next/prev walk the artist's tracks rather than the whole library.
   */
  function artistSongContext(): Song[] {
    const currentId = selectedSongIds[0];
    const album = albums.find((a) =>
      a.songs.some((s) => s.id === currentId)
    );
    return album?.songs ?? filteredSongs;
  }

  async function handleAlbumDetailFormSubmit(dto: AlbumDetailDto) {
    const albumTitle = dto.albumTitle;
    const albumArtist = dto.albumArtist;
    const cover = dto.coverFront ? { coverFront: dto.coverFront } : undefined;

    for (const song of dto.songs) {
      let currentSong = filteredSongs.find((s) => s.id == song.id);

      if (currentSong) {
        const updatedSong: Partial<Song> = {
          title: song.title,
          track: song.track,
          album: albumTitle,
          albumArtist,
        };

        await updateTags(currentSong, updatedSong, cover);
        wmmBus.publish("wmm.library.song.updated", { songId: currentSong.id });
        getJobService().enqueue({
          type: "Thumbnail Generation",
          payload: {
            song: {
              ...currentSong,
              ...updatedSong,
            },
          },
        });
      }
    }

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
      wmmBus.publish("wmm.ui.selectionChanged", { songIds: newIds });
    }
    if (mode === "albums") {
      if (!selectedAlbum) return;

      const albumIds = albums.map((a) => a.id);
      const index = albumIds.indexOf(selectedAlbum.id);

      if (index <= 0) return;

      const prevAlbum = albums[index - 1];
      const newIds = prevAlbum.songs.map((s) => s.id);

      setSelectedSongIds(newIds);
      wmmBus.publish("wmm.ui.selectionChanged", { songIds: newIds });
    }
    if (mode === "artists") {
      // On the artist page, prev walks the artist's own tracks in the song
      // editor, and steps albums in the album editor.
      if (advancedDialog === "album") {
        handleAlbumDetailsPrevClicked();
        return;
      }
      const list = artistSongContext();
      const i = list.findIndex((s) => s.id === selectedSongIds[0]);
      if (i <= 0) return;
      const newIds = [list[i - 1].id];
      setSelectedSongIds(newIds);
      wmmBus.publish("wmm.ui.selectionChanged", { songIds: newIds });
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
      wmmBus.publish("wmm.ui.selectionChanged", { songIds: newIds });
    }
    if (mode === "albums") {
      if (!selectedAlbum) return;

      const albumIds = albums.map((a) => a.id);
      const index = albumIds.indexOf(selectedAlbum.id);

      if (index >= albumIds.length - 1) return;

      const nextAlbum = albums[index + 1];
      const newIds = nextAlbum.songs.map((s) => s.id);

      setSelectedSongIds(newIds);
      wmmBus.publish("wmm.ui.selectionChanged", { songIds: newIds });
    }
    if (mode === "artists") {
      // Symmetric with prev: walk the artist's tracks, or albums in the
      // album editor.
      if (advancedDialog === "album") {
        handleAlbumDetailsNextClicked();
        return;
      }
      const list = artistSongContext();
      const i = list.findIndex((s) => s.id === selectedSongIds[0]);
      if (i === -1 || i >= list.length - 1) return;
      const newIds = [list[i + 1].id];
      setSelectedSongIds(newIds);
      wmmBus.publish("wmm.ui.selectionChanged", { songIds: newIds });
    }
  }
  //#endregion
  //#region Subscribe to domain events
  useEffect(() => {
    const subSelected = wmmBus.on("wmm.ui.selectionChanged", (payload) => {
      const ids = payload?.songIds ?? [];
      setSelectedSongIds(ids);
      const songs = filteredSongs.filter((s) => ids.includes(s.id));
      setSelectedSongs(songs);
      if (mode === "albums") {
        if (!songs[0]?.album) return;
        setSelectedAlbum(albums.find((a) => a.title == songs[0].album));
      }
    });

    // "Edit song" command opens the advanced editor for the given song.
    const unregisterEdit = commandDispatcher.register(
      "wmm.library.song.edit",
      (payload?: { songId?: string }) => {
        if (!payload?.songId) return;
        const song =
          filteredSongs.find((s) => s.id === payload.songId) ??
          albums.flatMap((a) => a.songs).find((s) => s.id === payload.songId);
        if (!song) return;
        switch (mode) {
          case "albums":
            if (!song.album) return;
            setSelectedAlbum(albums.find((a) => a.title == song.album));
            openAdvancedEdit("album");
            break;
          case "artists": {
            // The artist view edits per-row: a double-clicked song opens the
            // song's advanced editor (the song drawer). Double-clicking an
            // album is a separate command (`wmm.library.album.edit`) and
            // opens the album dialog instead.
            setSelectedSongIds([song.id]);
            setSelectedSongs([song]);
            setAdvancedDialog("song");
            setIsAdvancedEdit(true);
            break;
          }
          case "songs":
            setSelectedSongIds([song.id]);
            setSelectedSongs([song]);
            setAdvancedDialog("song");
            setIsAdvancedEdit(true);
            break;
          default:
            break;
        }
      }
    );

    // Album advanced editor (opened from the artist view's album double-click).
    const unregisterAlbumEdit = commandDispatcher.register(
      "wmm.library.album.edit",
      (payload?: { songId?: string }) => {
        if (!payload?.songId) return;
        const song =
          filteredSongs.find((s) => s.id === payload.songId) ??
          albums.flatMap((a) => a.songs).find((s) => s.id === payload.songId);
        if (!song?.album) return;
        const album = albums.find(
          (a) =>
            a.title === song.album &&
            a.artist === (song.artist ?? "Unknown Artist")
        );
        if (!album) return;
        setSelectedAlbum(album);
        openAdvancedEdit("album");
      }
    );

    return () => {
      subSelected();
      unregisterEdit();
      unregisterAlbumEdit();
    };
  }, [filteredSongs, albums, mode]);

  useEffect(() => {
    const sub = keyShortcut$.subscribe((shortcut) => {
      if (shortcut === "next") handleNextClick();
      if (shortcut === "prev") handlePrevClick();
      if (shortcut === "edit") setIsAdvancedEdit(true);
      if (shortcut === "close") setSelectedSongIds([]);
    });

    return () => sub.unsubscribe();
  });

  //#endregion

  return (
    <>
      {selectedSongIds.length > 0 && !isAdvancedEdit && (
        <div className="flex shrink-0 p-4 border-t bg-secondary/50 select-none">
          <div className="max-w-240 mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <PreviewButton
                  key={selectedSongs[0]?.id ?? "none"}
                  songId={selectedSongs[0]?.id}
                  disabled={selectedSongIds.length !== 1}
                />
                <h3 className="font-medium truncate">
                  {selectedSongs.length > 1 ? `Quick Edit (${selectedSongs.length} selected)` : selectedSongs[0]?.filename ?? "Quick Edit"}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsAdvancedEdit(true)}
                >
                  <PencilRuler />
                  Advanced Edit
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  type="reset"
                  form="quick-edit-form"
                  disabled={!quickDirty}
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
                  disabled={!editable || !quickDirty}
                  className="bg-accent/50 hover:bg-accent/70 text-white"
                >
                  <Save />
                  Save
                </Button>
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
              onDirtyChange={setQuickDirty}
            />
          </div>
        </div>
      )}

      <Drawer
        open={
          isAdvancedEdit &&
          advancedDialog === "song" &&
          (mode === "songs" || mode === "artists")
        }
        onOpenChange={setIsAdvancedEdit}
      >
        {selectedSongs.length === 1 && (
          <DrawerContent className="p-6 pt-0">
            <DrawerHeader className="select-none self-center">
              <div className="flex items-center gap-3">
                <PreviewButton
                  key={selectedSongs[0]?.id ?? "none"}
                  songId={selectedSongs[0]?.id}
                  disabled={selectedSongs.length !== 1}
                />
                <div>
                  <DrawerTitle>{selectedSongs[0].filename}</DrawerTitle>
                  <DrawerDescription>
                    Update the metadata for the selected song
                  </DrawerDescription>
                </div>
              </div>
            </DrawerHeader>

            <div className="overflow-y-auto">
              <SongEditForm
                key={selectedSongs[0].id}
                song={selectedSongs[0]}
                onFormSubmit={handleSongUpdate}
                onNavigatePrev={handlePrevClick}
                onNavigateNext={handleNextClick}
                isPrevDisabled={isSongPrevButtonDisabled()}
                isNextDisabled={isSongNextButtonDisabled()}
                onClose={() => setIsAdvancedEdit(false)}
              />
            </div>
          </DrawerContent>
        )}
      </Drawer>
      <AlbumDetailDialog
        open={
          isAdvancedEdit &&
          (mode === "albums" || (mode === "artists" && advancedDialog === "album"))
        }
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
