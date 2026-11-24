import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  GripVertical,
  Lock,
  Pen,
  Play,
  Plus,
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
import {
  SidebarDropRow,
  sidebarPlaylistDropId,
} from "@/components/library-sidebar";
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
import { SongSearchPanel } from "@/components/song-search";
import { useHiddenSongs, useShufflePlay, useSongs } from "@/hooks";
import { useLocation, useNavigate, useOutletContext, useSearchParams } from "react-router";
import type { MainContext } from "./MainLayout";
import type { MusicSource, Playlist, Song } from "@/models";
import { FAVORITES_PLAYLIST_ID } from "@/models";
import { cn } from "cn";
import { useDetailPane } from "@/lib/router/useDetailPane";
import { NewPlaylistDialog } from "@/components/new-playlist-dialog";
import { useTranslation } from "@/i18n";
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
  const { t } = useTranslation();

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
          title={t("playlist.dragToReorder")}
          aria-label={t("playlist.dragToReorder")}
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
export function Playlists({
  compact = false,
  onOpenPlaylist,
}: {
  compact?: boolean;
  /** Sidebar only: open this playlist in the full view. */
  onOpenPlaylist?: (playlistId: string) => void;
} = {}) {
  //#region State
  const { t } = useTranslation();
  const { songs } = useSongs();
  const { hiddenSongIds } = useHiddenSongs();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [searchParams] = useSearchParams();
  // Set when the sidebar opened a playlist, so the full view lands on it.
  const requestedPlaylistId = searchParams.get("playlist") ?? undefined;
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
  // Absent when the sidebar renders this view directly instead of through an
  // outlet, which is why it is read defensively rather than destructured.
  const activeMode = useOutletContext<MainContext | null>()?.activeMode;
  // The sidebar renders this view outside the outlet, where neither the outlet
  // context nor the child route's params are reachable, so the pathname is the
  // only edit-mode signal available there.
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [compactEditing, setCompactEditing] = useState(false);
  const [compactFilter, setCompactFilter] = useState("");
  const editMode =
    activeMode === "edit" ||
    pathname.endsWith("/edit") ||
    (isCompact && compactEditing);
  //#endregion

  useEffect(() => {
    if (requestedPlaylistId) {
      setSelectedId(requestedPlaylistId);
    }
  }, [requestedPlaylistId]);

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
  // rendered as gaps, and a hidden song is left out of the list it was hidden
  // from.
  const tracks = useMemo(
    () =>
      (selected?.songs ?? [])
        .map((entry) => songsById.get(entry.songId))
        .filter((song): song is Song => Boolean(song))
        .filter((song) => !hiddenSongIds.has(song.id)),
    [selected, songsById, hiddenSongIds]
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
          !hiddenSongIds.has(song.id) &&
          [song.title, song.artist, song.album, song.albumArtist, song.genre].some(
            (f) => f?.toLowerCase().includes(q)
          )
      )
      .slice(0, 50);
  }, [addQuery, songs, tracks, hiddenSongIds]);

  // Artists and albums whose name matches, so a whole record can be added
  // without typing every track title. Mirrors the sync queue's add-search.
  const addArtistResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const counts = new Map<string, number>();
    for (const song of songs) {
      const artist = song.albumArtist || song.artist;
      if (!artist || !artist.toLowerCase().includes(q)) continue;
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, trackCount]) => ({ name, trackCount }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [addQuery, songs]);

  const addAlbumResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const counts = new Map<string, { artist?: string; trackCount: number }>();
    for (const song of songs) {
      if (!song.album || !song.album.toLowerCase().includes(q)) continue;
      const key = `${song.albumArtist ?? song.artist ?? ""}|${song.album}`;
      const existing = counts.get(key);
      if (existing) existing.trackCount++;
      else
        counts.set(key, {
          artist: song.albumArtist ?? song.artist,
          trackCount: 1,
        });
    }
    return [...counts.entries()]
      .map(([key, value]) => ({
        key,
        album: key.split("|")[1] ?? "",
        artist: value.artist,
        trackCount: value.trackCount,
      }))
      .sort((a, b) => a.album.localeCompare(b.album))
      .slice(0, 10);
  }, [addQuery, songs]);

  // Every library song by an artist, or on an album, so one click adds the
  // whole group.
  function songIdsForArtist(artist: string): string[] {
    return songs
      .filter((song) => (song.albumArtist || song.artist) === artist)
      .map((song) => song.id);
  }

  function songIdsForAlbum(album: string, artist?: string): string[] {
    return songs
      .filter(
        (song) =>
          song.album === album &&
          (song.albumArtist ?? song.artist) === artist
      )
      .map((song) => song.id);
  }

  const addGenreResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const counts = new Map<string, number>();
    for (const song of songs) {
      if (!song.genre || !song.genre.toLowerCase().includes(q)) continue;
      counts.set(song.genre, (counts.get(song.genre) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, trackCount]) => ({ name, trackCount }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [addQuery, songs]);

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

  /**
   * Commit the inline title when it changed. Runs on Enter and on blur, so
   * leaving the field or pressing Done both persist the name.
   */
  function commitRename(): void {
    if (!selected) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === selected.name) return;
    void renamePlaylist(trimmed);
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

  // Rendered by both the full view and the sidebar's compact list, which
  // returns before the full view's markup.
  const deleteDialog = (
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent className="select-none w-lg">
        <DialogHeader>
          <DialogTitle>{t("playlist.deleteTitle")}</DialogTitle>
          <DialogDescription>
            {t("playlist.deleteDescription", [
              playlists.find((p) => p.id === pendingDeleteId)?.name ?? "",
            ])}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <DialogClose
            render={<Button variant="outline">{t("common.cancel")}</Button>}
          />

          <Button variant="destructive" onClick={() => void deletePending()}>
            {t("common.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

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

  if (compact) {
    // Sidebar: the playlist list alone, each row a drop target. The detail
    // pane and the page header belong to the full view.
    const filter = compactFilter.trim().toLowerCase();
    const visiblePlaylists =
      filter === ""
        ? playlists
        : playlists.filter((playlist) =>
            playlist.name.toLowerCase().includes(filter)
          );

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <Input
            value={compactFilter}
            onChange={(event) => setCompactFilter(event.target.value)}
            placeholder={t("playlist.filter")}
            aria-label={t("playlist.filter")}
            className="h-7 min-w-0 flex-1 text-xs"
          />
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title={t("playlist.new")}
            aria-label={t("playlist.new")}
            onClick={() => setNewPlaylistOpen(true)}
          >
            <Plus />
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="py-1">
            {visiblePlaylists.map((playlist) => {
              const readOnly = isPlaylistReadOnly(playlist, sources);
              const sourceName = sources.find(
                (source) => source.id === playlist.sourceId
              )?.name;

              return (
                <SidebarDropRow
                  key={playlist.id}
                  id={sidebarPlaylistDropId(playlist.id)}
                  disabled={readOnly}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => onOpenPlaylist?.(playlist.id)}
                  >
                    {playlist.name}
                  </button>
                  {readOnly && (
                    <span
                      className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
                      title={t("playlist.readOnlyFrom", [
                        sourceName ?? t("playlist.unknownSource"),
                      ])}
                    >
                      <Lock className="size-3 shrink-0" aria-hidden="true" />
                      <span className="max-w-20 truncate">
                        {sourceName ?? t("playlist.readOnly")}
                      </span>
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {playlist.songs.length}
                  </span>
                  {!readOnly &&
                    editMode &&
                    playlist.id !== FAVORITES_PLAYLIST_ID && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-5 shrink-0"
                      title={t("playlist.delete")}
                      aria-label={t("playlist.deleteNamed", [
                        playlist.name,
                      ])}
                      onClick={() => {
                        setPendingDeleteId(playlist.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </SidebarDropRow>
              );
            })}

            {visiblePlaylists.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                {compactFilter.trim() === ""
                  ? t("playlist.none")
                  : t("playlist.noMatches")}
              </div>
            )}
          </div>
        </ScrollArea>

        <NewPlaylistDialog
          open={newPlaylistOpen}
          onOpenChange={setNewPlaylistOpen}
          onCreate={createPlaylist}
        />

        {deleteDialog}
      </div>
    );
  }

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
              <div className="font-bold">{t("navigation.playlists")}</div>
              <div className="text-xs text-muted-foreground">
                {t("playlist.count", [playlists.length])}
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0"
              title={t("playlist.new")}
              aria-label={t("playlist.new")}
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
                    {t("library.songCount", [playlist.songs.length])}
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 dark:hover:bg-destructive hover:bg-destructive"
                  title={t("playlist.deleteNamed", [playlist.name])}
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
                {t("playlist.none")}
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
                  aria-label={t("playlist.backToPlaylists")}
                  onClick={() => setMobileShowingList(true)}
                >
                  <ChevronLeft />
                </Button>
              )}
              {canEdit && !selected.isFavorites ? (
                // Edit mode: the title is an inline field that commits on
                // Enter or blur, so "Done" is the only button in the header.
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    commitRename();
                  }}
                >
                  <Input
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={commitRename}
                    placeholder={t("playlist.name")}
                    className={cn(
                      "h-auto font-bold py-0",
                      isCompact ? "text-xl md:text-xl" : "text-3xl md:text-3xl"
                    )}
                    aria-label={t("playlist.name")}
                  />
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
                    {t("library.songCount", [tracks.length])}
                    {selectedReadOnly && (
                      <span title={t("playlist.readOnlyManaged")}>
                        {" · "}
                        {t("playlist.readOnly")}
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
                      title={t("playback.playAll")}
                      onClick={() => playSongs(tracks)}
                    >
                      <Play className="fill-current" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={t("playback.shuffle")}
                      onClick={() => shuffleSongs(tracks)}
                    >
                      <Shuffle />
                    </Button>
                  </>
                )}

                {!selectedReadOnly && (
                  <Button
                    size="sm"
                    variant={editMode ? "default" : "outline"}
                    className="shrink-0"
                    aria-pressed={editMode}
                    onClick={() => {
                      // The button suppresses focus, so blur may not fire.
                      commitRename();
                      if (editMode) {
                        setCompactEditing(false);
                        // Route-level edit mode needs a route change to leave.
                        if (
                          activeMode === "edit" ||
                          pathname.endsWith("/edit")
                        ) {
                          // Keep the open playlist: the detail pane lives in
                          // the location state, which a plain push would drop.
                          navigate(
                            { pathname: "/playlists/playback", search: "" },
                            {
                              state: {
                                ...(location.state as object),
                                detailPane: true,
                              },
                            }
                          );
                        }
                        return;
                      }
                      if (isCompact) {
                        setCompactEditing(true);
                        return;
                      }
                      navigate("/playlists/edit");
                    }}
                  >
                    {editMode ? <Check /> : <Pen />}
                    {editMode ? t("common.done") : t("common.edit")}
                  </Button>
                )}
              </div>
            </div>

            {!selectedReadOnly && (
              <div className={cn("shrink-0 pb-2", isCompact ? "px-3" : "px-5")}>
                <SongSearchPanel
                  className="max-w-md"
                  query={addQuery}
                  onQueryChange={setAddQuery}
                  title={t("playlist.add")}
                  ariaLabel={t("search.songsToAdd")}
                  songs={addResults}
                  artists={addArtistResults}
                  albums={addAlbumResults}
                  genres={addGenreResults}
                  onAddSong={(song) =>
                    void addSongsToPlaylist(selected.id, [song.id])
                  }
                  onAddGenre={(genre) =>
                    void addSongsToPlaylist(
                      selected.id,
                      songs
                        .filter((song) => song.genre === genre.name)
                        .map((song) => song.id)
                    )
                  }
                  onAddArtist={(artist) =>
                    void addSongsToPlaylist(
                      selected.id,
                      songIdsForArtist(artist.name)
                    )
                  }
                  onAddAlbum={(album) =>
                    void addSongsToPlaylist(
                      selected.id,
                      songIdsForAlbum(album.album, album.artist)
                    )
                  }
                />
              </div>
            )}

            <ScrollArea className="flex-1 min-h-0">
              <div className={cn("pb-6", isCompact ? "px-3" : "px-5")}>
                <>
                  {addQuery.trim() && (
                    <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t("playlist.inThisPlaylist", [tracks.length])}
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
                                title={t("playlist.removeTrack")}
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
                      {t("playlist.empty")}
                    </div>
                  )}
                </>
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            {t("playlist.select")}
          </div>
        )}
      </div>

      <NewPlaylistDialog
        open={newPlaylistOpen}
        onOpenChange={setNewPlaylistOpen}
        onCreate={createPlaylist}
      />

      {deleteDialog}
    </div>
  );
}
