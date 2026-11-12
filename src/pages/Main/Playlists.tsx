import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  GripVertical,
  Pen,
  Play,
  Plus,
  Save,
  Search,
  Shuffle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ItemGroup } from "@/components/ui/item";
import { TrackItem } from "@/components/track-item";
import { setCurrentNavSongs } from "@/components/editor";
import { useIsCompact, useIsMobile } from "@/lib/hooks/useIsMobile";
import { getPlaylistStore, getSourcesStore } from "@/core/ports";
import {
  addSongsToPlaylist,
  deletePlaylist,
  moveSongInPlaylist,
  removeSongFromPlaylist,
  savePlaylist,
} from "@/core/playlists";
import { isPlaylistReadOnly } from "@/core/playlists";
import { wmmBus } from "@/events";
import { useShufflePlay, useSongs } from "@/hooks";
import { useOutletContext } from "react-router";
import type { MainContext } from "./MainLayout";
import type { MusicSource, Playlist, Song } from "@/models";
import { cn } from "cn";
import { useDetailPane } from "@/lib/router/useDetailPane";
import { NewPlaylistDialog } from "@/components/new-playlist-dialog";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Keep a dragged row on the list's vertical axis. */
const lockToVerticalAxis: Modifier = ({ transform }) => ({
  ...transform,
  x: 0,
});

/**
 * One playlist row that can be dragged to reorder. Only edit mode shows the
 * grab handle; the row's own click/double-click stay untouched because the
 * drag listeners live on the handle alone.
 */
function SortableRow({
  id,
  editing,
  children,
}: {
  id: string;
  editing: boolean;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editing });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center bg-background",
        isDragging && "z-10 opacity-80 shadow-lg"
      )}
    >
      {editing && (
        <button
          ref={setActivatorNodeRef}
          type="button"
          title="Drag to reorder"
          aria-label="Drag to reorder"
          className="shrink-0 cursor-grab touch-none px-1 py-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
}

/**
 * Playlists view: the user's playlists on the left, the selected playlist's
 * tracks on the right. Phones show one column at a time, like the artist
 * view.
 */
export function Playlists() {
  //#region State
  const { songs } = useSongs();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [nowPlayingSongId, setNowPlayingSongId] = useState<string>();
  const [mobileShowingList, setMobileShowingList] = useDetailPane();
  // The inline title form tracks the open playlist's name (and picks up the
  // rename after a save). `selected` is declared below with the other
  // derived values, so the sync effect lives with the page effects.
  const [addQuery, setAddQuery] = useState("");
  const [renameValue, setRenameValue] = useState("");
  // Deletion is destructive and un-creatable, so it asks first. Held as the
  // pending playlist's id so the trash in the list can target any playlist.
  const [pendingDeleteId, setPendingDeleteId] = useState<string>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const shufflePlay = useShufflePlay();
  const isCompact = useIsCompact();
  const isMobile = useIsMobile();
  const { activeMode } = useOutletContext<MainContext>();
  const [compactEditing, setCompactEditing] = useState(false);
  const editMode = activeMode === "edit" || (isCompact && compactEditing);
  //#endregion

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  //#endregion

  //#region Data
  useEffect(() => {
    let cancelled = false;
    const store = (() => {
      try {
        return getPlaylistStore();
      } catch {
        // No playlist store registered for this binding.
        return null;
      }
    })();
    if (!store) return;

    const sortByName = (list: Playlist[]) =>
      [...list].sort(
        (a, b) =>
          Number(Boolean(b.isFavorites)) - Number(Boolean(a.isFavorites)) ||
          a.name.localeCompare(b.name)
      );

    store.getAll().then((next) => {
      if (!cancelled) setPlaylists(sortByName(next));
    });

    const offAdded = store.onAdded((playlist) =>
      setPlaylists((prev) =>
        prev.some((p) => p.id === playlist.id)
          ? prev
          : sortByName([...prev, playlist])
      )
    );
    const offUpdated = store.onUpdated((playlist) =>
      setPlaylists((prev) =>
        sortByName(prev.map((p) => (p.id === playlist.id ? playlist : p)))
      )
    );
    const offDeleted = store.onDeleted((playlist) =>
      setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id))
    );
    const offCleared = store.onStoreCleared(() => setPlaylists([]));
    // A bulk import writes playlists from a worker, which store listeners on
    // this thread never see; the import event says to reload.
    const offImported = wmmBus.on("wmm.playlists.imported", () => {
      store.getAll().then((next) => {
        if (!cancelled) setPlaylists(sortByName(next));
      });
    });

    return () => {
      cancelled = true;
      offAdded();
      offUpdated();
      offDeleted();
      offCleared();
      offImported();
    };
  }, []);

  const songsById = useMemo(() => {
    const map = new Map<string, Song>();
    for (const song of songs) map.set(song.id, song);
    return map;
  }, [songs]);

  const selected = playlists.find((p) => p.id === selectedId);

  // Playlists synced from a source that cannot write playlists (e.g. a
  // Subsonic server) are shown but not editable.
  const [sources, setSources] = useState<MusicSource[]>([]);
  useEffect(() => {
    let cancelled = false;
    getSourcesStore()
      .getSources()
      .then((next) => {
        if (!cancelled) setSources(next);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [playlists]);
  const selectedReadOnly = selected
    ? isPlaylistReadOnly(selected, sources)
    : false;
  // Structural edits (rename, reorder, add/remove songs) need an editable
  // playlist in edit mode.
  const canEdit = editMode && !selectedReadOnly;

  // The inline title form tracks the open playlist's name (and picks up the
  // rename after a save).
  const nameKey = `${selected?.id}|${selected?.name}`;
  const [syncedNameKey, setSyncedNameKey] = useState(nameKey);
  if (syncedNameKey !== nameKey) {
    setSyncedNameKey(nameKey);
    setRenameValue(selected?.name ?? "");
  }

  // Entries whose song is no longer in the library are skipped rather than
  // rendered as gaps.
  const tracks = useMemo(
    () =>
      (selected?.songs ?? [])
        .map((entry) => songsById.get(entry.songId))
        .filter((song): song is Song => Boolean(song)),
    [selected, songsById]
  );

  // Library songs matching the add-search that are not already in the open
  // playlist. Capped so a one-letter query does not render the whole library.
  const addResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const inPlaylist = new Set(tracks.map((t) => t.id));
    return songs
      .filter(
        (song) =>
          !inPlaylist.has(song.id) &&
          [song.title, song.artist, song.album, song.albumArtist].some((f) =>
            f?.toLowerCase().includes(q)
          )
      )
      .slice(0, 50);
  }, [addQuery, songs, tracks]);

  // The editor dock's prev/next walks the open playlist's tracks. The dock
  // portals elsewhere, so the page hands it the list via the nav context;
  // publishing nothing on unmount avoids walking a stale list.
  useEffect(() => {
    setCurrentNavSongs(tracks);
    return () => setCurrentNavSongs([]);
  }, [tracks]);

  /**
   * Remove tracks from the open playlist. Multi-selection: the context menu
   * publishes the selection, so remove every selected song that is in the
   * playlist. Persists through the store, which also updates the on-source
   * artifact for sources that write playlists.
   */
  async function removeTracks(songIds: string[]): Promise<void> {
    if (!selected) return;
    const present = new Set(tracks.map((t) => t.id));
    for (const songId of songIds) {
      if (!present.has(songId)) continue;
      await removeSongFromPlaylist(selected.id, songId);
    }
  }

  /** Rename the open playlist from the inline title form. */
  async function renamePlaylist(name: string): Promise<void> {
    if (!selected) return;
    await savePlaylist({ id: selected.id, name });
  }

  /** Delete the pending-picked playlist and clear the selection if it was open. */
  async function deletePending(): Promise<void> {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(undefined);
    setDeleteDialogOpen(false);
    if (selectedId === id) setSelectedId(undefined);
    await deletePlaylist(id);
  }
  //#endregion

  //#region Global event handlers
  useEffect(() => {
    const sub = wmmBus.on("wmm.playback.started", (payload) => {
      if (payload?.songId) setNowPlayingSongId(payload.songId);
    });

    return () => {
      sub();
    };
  }, []);
  //#endregion

  //#region Interactivity handlers
  /** Single-click in edit mode: open the quick edit dock for the song. */
  function quickEditSong(song: Song): void {
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: [song.id] });
  }

  /** Double-click in edit mode: open the song's advanced editor. */
  function editSong(song: Song): void {
    wmmBus.invoke("wmm.library.song.edit", { songId: song.id });
  }

  function playSongs(list: Song[]): void {
    const ids = list.map((song) => song.id);
    if (!ids.length) return;
    wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
    wmmBus.invoke("wmm.playback.playSong", { songId: ids[0] });
  }

  /** Play one track with the playlist as the queue, so next/prev stay in it. */
  function playTrack(song: Song): void {
    const ids = tracks.map((entry) => entry.id);
    if (ids.length) wmmBus.invoke("wmm.playback.playQueue", { songIds: ids });
    wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
  }

  function shuffleSongs(list: Song[]): void {
    shufflePlay(list.map((song) => song.id));
  }

  /** Drop: move the dragged song to where the target song sits. */
  function onDragEnd({ active, over }: DragEndEvent): void {
    if (!selected || !over || active.id === over.id) return;
    void moveSongInPlaylist(selected.id, String(active.id), String(over.id));
  }

  /** Create an empty playlist and open it. */
  async function createPlaylist(name: string): Promise<void> {
    const created = await savePlaylist({ name, songs: [] });
    setSelectedId(created.id);
    setAddQuery("");
    setMobileShowingList(false);
  }

  function selectPlaylist(playlist: Playlist): void {
    setSelectedId(playlist.id);
    setAddQuery("");
    setMobileShowingList(false);
  }
  //#endregion

  return (
    <div className="h-full w-full flex">
      <div
        className={cn(
          "shrink-0 border-r flex flex-col min-h-0",
          isMobile ? "w-full" : "w-60",
          isMobile && !mobileShowingList && "hidden"
        )}
      >
        <div className="px-3 py-2 border-b">
          <div className="flex flex-row items-center gap-2">
            <div className="flex-1">
              <div className="font-bold">Playlists</div>
              <div className="text-xs text-muted-foreground">
                {playlists.length}{" "}
                {playlists.length === 1 ? "playlist" : "playlists"}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0"
              title="New playlist"
              aria-label="New playlist"
              onClick={() => setNewPlaylistOpen(true)}
            >
              <Plus />
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="py-1">
            {playlists.map((playlist) => (
              <div
                key={playlist.id}
                className={cn(
                  "flex w-full items-center gap-1 rounded-md py-1.5 pr-1 pl-2.5 transition-colors",
                  playlist.id === selectedId
                    ? "bg-accent/50 text-accent-foreground"
                    : ""
                )}
              >
                <button
                  onClick={() => selectPlaylist(playlist)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate">{playlist.name}</span>
                  <span
                    className={cn(
                      "block truncate text-xs text-muted-foreground",
                      playlist.id === selectedId ? "text-accent-foreground" : ""
                    )}
                  >
                    {playlist.songs.length}{" "}
                    {playlist.songs.length === 1 ? "song" : "songs"}
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 dark:hover:bg-destructive hover:bg-destructive"
                  title={`Delete ${playlist.name}`}
                  hidden={
                    !editMode ||
                    playlist.isFavorites ||
                    isPlaylistReadOnly(playlist, sources)
                  }
                  onClick={() => {
                    setPendingDeleteId(playlist.id);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}

            {playlists.length === 0 && (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No playlists yet
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col min-h-0 min-w-0",
          isMobile && mobileShowingList && "hidden"
        )}
      >
        {selected ? (
          <>
            <div
              className={cn(
                "shrink-0 flex items-center justify-between gap-3",
                isCompact ? "px-3 pt-3 pb-2" : "px-5 pt-4 pb-2"
              )}
            >
              {isMobile && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0"
                  aria-label="Back to playlists"
                  onClick={() => setMobileShowingList(true)}
                >
                  <ChevronLeft />
                </Button>
              )}
              {canEdit && !selected.isFavorites ? (
                // Edit mode: the title is an inline form — name box with a
                // save button beside it, no modal step.
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const trimmed = renameValue.trim();
                    if (trimmed && trimmed !== selected.name) {
                      void renamePlaylist(trimmed);
                    }
                  }}
                >
                  <Input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    placeholder="Playlist name"
                    className={cn(
                      "h-auto font-bold py-0",
                      isCompact ? "text-xl md:text-xl" : "text-3xl md:text-3xl"
                    )}
                    aria-label="Playlist name"
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={
                      !renameValue.trim() ||
                      renameValue.trim() === selected.name
                    }
                  >
                    <Save />
                    Save
                  </Button>
                </form>
              ) : (
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "truncate font-bold",
                      isCompact ? "text-xl" : "text-3xl"
                    )}
                  >
                    {selected.name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {tracks.length} {tracks.length === 1 ? "song" : "songs"}
                    {selectedReadOnly && (
                      <span title="Managed by its music source; edit it there">
                        {" · Read-only"}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                {tracks.length > 0 && !editMode && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Play all"
                      onClick={() => playSongs(tracks)}
                    >
                      <Play className="fill-current" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Shuffle"
                      onClick={() => shuffleSongs(tracks)}
                    >
                      <Shuffle />
                    </Button>
                  </>
                )}

                {isCompact && !selectedReadOnly && (
                  <Button
                    size="sm"
                    variant={compactEditing ? "default" : "outline"}
                    className="shrink-0"
                    aria-pressed={compactEditing}
                    onClick={() => setCompactEditing((prev) => !prev)}
                  >
                    {compactEditing ? <Check /> : <Pen />}
                    {compactEditing ? "Done" : "Edit"}
                  </Button>
                )}
              </div>
            </div>

            {!selectedReadOnly && (
              <div className={cn("shrink-0 pb-2", isCompact ? "px-3" : "px-5")}>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={addQuery}
                    onChange={(event) => setAddQuery(event.target.value)}
                    placeholder="Search songs to add"
                    aria-label="Search songs to add"
                    className="pl-8"
                  />
                </div>
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0">
              <div className={cn("pb-6", isCompact ? "px-3" : "px-5")}>
                {!selectedReadOnly && addQuery.trim() && (
                  <section className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 pb-1 pt-2">
                    <div className="flex items-center justify-between pb-1 text-xs font-semibold uppercase tracking-wide text-primary">
                      <span>Add to playlist</span>
                      <span>
                        {addResults.length === 50 ? "50+" : addResults.length}{" "}
                        {addResults.length === 1 ? "match" : "matches"}
                      </span>
                    </div>
                    <ItemGroup className="gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0! divide-y divide-border">
                      {addResults.map((song) => (
                        <div key={song.id} className="flex items-center">
                          <TrackItem
                            song={song}
                            size="sm"
                            hideNumber
                            onPlay={playTrack}
                            className="min-w-0 flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 mr-1"
                            title="Add to playlist"
                            onClick={() =>
                              void addSongsToPlaylist(selected.id, [song.id])
                            }
                          >
                            <Plus />
                          </Button>
                        </div>
                      ))}
                      {addResults.length === 0 && (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          No matching songs to add
                        </div>
                      )}
                    </ItemGroup>
                  </section>
                )}

                <>
                  {addQuery.trim() && (
                    <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      In this playlist · {tracks.length}
                    </div>
                  )}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    modifiers={[lockToVerticalAxis]}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={tracks.map((t) => t.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ItemGroup className="gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0! divide-y divide-border">
                        {tracks.map((song, i) => (
                          // Edit mode: the grab handle and remove control ride on
                          // the row itself instead of hiding in the ⋯ menu.
                          <SortableRow
                            key={song.id}
                            id={song.id}
                            editing={canEdit}
                          >
                            <TrackItem
                              song={song}
                              position={i + 1}
                              size="sm"
                              isPlaying={nowPlayingSongId === song.id}
                              onPlay={playTrack}
                              onClick={
                                activeMode === "edit"
                                  ? quickEditSong
                                  : undefined
                              }
                              onDoubleClick={
                                activeMode === "edit" ? editSong : playTrack
                              }
                              className="min-w-0 flex-1"
                            />
                            {canEdit && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="shrink-0 mr-1"
                                title="Remove from playlist"
                                onClick={() => void removeTracks([song.id])}
                              >
                                <Trash2 />
                              </Button>
                            )}
                          </SortableRow>
                        ))}
                      </ItemGroup>
                    </SortableContext>
                  </DndContext>

                  {tracks.length === 0 && (
                    <div className="py-10 text-center text-sm text-muted-foreground">
                      This playlist is empty
                    </div>
                  )}
                </>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a playlist
          </div>
        )}
      </div>

      <NewPlaylistDialog
        open={newPlaylistOpen}
        onOpenChange={setNewPlaylistOpen}
        onCreate={createPlaylist}
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="select-none w-lg">
          <DialogHeader>
            <DialogTitle>Delete Playlist</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">
                {playlists.find((p) => p.id === pendingDeleteId)?.name}
              </span>
              . The songs themselves stay in your library.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />

            <Button variant="destructive" onClick={() => void deletePending()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
