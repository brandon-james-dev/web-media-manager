import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { MusicSource, Playlist, Song } from "@/models";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import { wmmBus } from "@/events";
import {
  ListMusic,
  ListPlus,
  MinusCircle,
  Pause,
  Pen,
  PencilRuler,
  Play,
  PlusCircle,
} from "lucide-react";
import { usePlayback, useSync } from "@/hooks";
import { useLocation, useParams } from "react-router";
import { getStore } from "@/core/system";
import { getPlaylistStore, getSourcesStore } from "@/core/ports";
import {
  addSongsToPlaylist,
  isPlaylistReadOnly,
  savePlaylist,
} from "@/core/playlists";
import { NewPlaylistDialog } from "@/components/new-playlist-dialog";
import { getCurrentSelection, setCurrentSelection } from "./selection";

export function SongContextMenu({
  songs,
  children,
}: {
  songs: Song[];
  children: ReactElement;
}) {
  const { mode } = useParams();
  const { pathname } = useLocation();
  const { queuedSongs, devices } = useSync();
  const { nowPlaying, isPlaying } = usePlayback();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  // Read when the menu opens (a page mounts many menus, so not per row).
  const [sources, setSources] = useState<MusicSource[]>([]);
  // The page's current multi-selection, resolved to songs. The row only
  // hands the menu the one right-clicked song, so the selection event is
  // the only channel that knows about a multi-select.
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);

  const song = songs[0];

  useEffect(() => {
    let cancelled = false;
    const resolve = (ids: string[]) => {
      setCurrentSelection(ids);
      if (ids.length === 0) {
        setSelectedSongs([]);
        return;
      }
      Promise.all(ids.map((id) => getStore().get(id))).then((found) => {
        if (!cancelled)
          setSelectedSongs(found.filter((s): s is Song => Boolean(s)));
      });
    };
    const sub = wmmBus.on("wmm.ui.selectionChanged", (payload) => {
      resolve(payload?.songIds ?? []);
    });

    return () => {
      cancelled = true;
      sub();
    };
  }, []);

  /**
   * Resolve the module-level selection snapshot at menu-open time. The menu
   * instance may have mounted after the last selection change (the table
   * remounts rows on re-render), so its event subscription alone can't be
   * relied on.
   */
  function handleMenuOpen(open: boolean) {
    if (!open) return;
    getSourcesStore()
      .getSources()
      .then(setSources)
      .catch(() => {});
    const ids = getCurrentSelection();
    if (ids.length > 1) {
      Promise.all(ids.map((id) => getStore().get(id))).then((found) =>
        setSelectedSongs(found.filter((s): s is Song => Boolean(s)))
      );
    }
  }

  // The menu acts on the whole selection when the right-clicked song is part
  // of it; a right-click outside the selection acts on that song alone.
  const target = useMemo(() => {
    if (
      selectedSongs.length > 1 &&
      song &&
      selectedSongs.some((s) => s.id === song.id)
    ) {
      return selectedSongs;
    }
    return songs;
  }, [selectedSongs, songs]);

  // Playlists synced from a read-only source can't take new songs.
  const editablePlaylists = useMemo(
    () => playlists.filter((p) => !isPlaylistReadOnly(p, sources)),
    [playlists, sources]
  );

  // Playlists for the "Add to playlist" submenu, kept live while the menu is
  // mounted so a playlist created elsewhere shows up without a reload.
  useEffect(() => {
    let cancelled = false;
    const store = (() => {
      try {
        return getPlaylistStore();
      } catch {
        return null;
      }
    })();
    if (!store) return;

    const sortByName = (list: Playlist[]) =>
      [...list].sort((a, b) => a.name.localeCompare(b.name));

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

    return () => {
      cancelled = true;
      offAdded();
      offUpdated();
      offDeleted();
      offCleared();
    };
  }, []);

  const isQueued = useMemo(() => {
    const queuedIds = new Set(queuedSongs.map((x) => x.id));

    return target.every((song) => queuedIds.has(song.id));
  }, [queuedSongs, target]);

  const isNowPlaying = useMemo(
    () => song && nowPlaying?.id === song.id && isPlaying,
    [song, nowPlaying, isPlaying]
  );

  const isInSyncPage = useMemo(() => pathname.includes("sync"), [pathname]);

  function onItemClick(callback: () => void) {
    wmmBus.publish("wmm.ui.selectionChanged", {
      songIds: target.map((x) => x.id),
    });
    callback();
  }

  /** Add every selected song to an existing playlist. */
  async function addToPlaylist(playlistId: string) {
    await addSongsToPlaylist(
      playlistId,
      target.map((s) => s.id)
    );
  }

  /**
   * Create a playlist from the selection. Playlists live in the app's own
   * store; a source that can persist playlists also gets a written copy
   * (savePlaylist decides that from the source's capabilities).
   */
  async function createPlaylist(name: string) {
    await savePlaylist({
      name,
      songs: target.map((s) => ({ songId: s.id, addedAt: Date.now() })),
    });
  }

  const isPlaybackHidden =
    (mode !== undefined && mode !== "playback") || isInSyncPage;

  const isEditHidden = mode !== "edit" || isInSyncPage;
  const hasConnectedDevices = devices.length > 0;

  return (
    <>
      <ContextMenu onOpenChange={handleMenuOpen}>
        <ContextMenuTrigger render={children} />

        <ContextMenuContent className="w-56 select-none">
          <ContextMenuGroup hidden={isPlaybackHidden}>
            <ContextMenuLabel>Playback</ContextMenuLabel>
            <ContextMenuItem
              onClick={() =>
                onItemClick(() =>
                  isNowPlaying
                    ? wmmBus.invoke("wmm.playback.playpause")
                    : song &&
                      wmmBus.invoke("wmm.playback.playSong", {
                        songId: song.id,
                      })
                )
              }
            >
              {isNowPlaying ? (
                <>
                  <Pause className="fill-foreground" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="fill-foreground" />
                  {target.length == 1 ? "Play Song" : "Play All"}
                </>
              )}
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() =>
                onItemClick(() =>
                  wmmBus.invoke("wmm.playback.addToQueue", {
                    songIds: target.map((s) => s.id),
                  })
                )
              }
            >
              <PlusCircle /> Add To Queue
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator hidden={isPlaybackHidden} />

          {/* Playlist actions: adding to a playlist and queueing for sync both
              build a list of songs, so they share a heading. */}
          <ContextMenuGroup hidden={isPlaybackHidden}>
            <ContextMenuLabel>Playlist</ContextMenuLabel>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ListPlus />
                Add To Playlist
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-52 select-none">
                {editablePlaylists.map((playlist) => (
                  <ContextMenuItem
                    key={playlist.id}
                    onClick={() => void addToPlaylist(playlist.id)}
                  >
                    <ListMusic />
                    <span className="min-w-0 flex-1 truncate">
                      {playlist.name}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {playlist.songs.length}
                    </span>
                  </ContextMenuItem>
                ))}

                {editablePlaylists.length > 0 && <ContextMenuSeparator />}

                <ContextMenuItem onClick={() => setNewPlaylistOpen(true)}>
                  <PlusCircle />
                  New Playlist…
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuGroup>

          <ContextMenuSeparator
            hidden={isPlaybackHidden || !hasConnectedDevices}
          />

          <ContextMenuGroup hidden={isEditHidden}>
            <ContextMenuLabel>Editing</ContextMenuLabel>
            <ContextMenuItem
              onClick={() =>
                onItemClick(() =>
                  wmmBus.invoke("wmm.library.song.quickEdit", {
                    songIds: target.map((s) => s.id),
                  })
                )
              }
            >
              <Pen />
              Quick Edit
            </ContextMenuItem>

            <ContextMenuItem
              onClick={() =>
                song &&
                wmmBus.invoke("wmm.library.song.edit", { songId: song.id })
              }
            >
              <PencilRuler />
              Advanced Edit
            </ContextMenuItem>
          </ContextMenuGroup>

          <ContextMenuSeparator hidden={isEditHidden || !hasConnectedDevices} />

          <ContextMenuGroup hidden={!hasConnectedDevices || !isQueued}>
            <ContextMenuLabel>Sync</ContextMenuLabel>
            <ContextMenuItem
              onClick={() =>
                onItemClick(() =>
                  wmmBus.invoke("wmm.sync.dequeueSongs", {
                    songIds: target.map((s) => s.id),
                  })
                )
              }
            >
              <MinusCircle /> Remove From Queue
            </ContextMenuItem>
          </ContextMenuGroup>
        </ContextMenuContent>
      </ContextMenu>

      <NewPlaylistDialog
        open={newPlaylistOpen}
        onOpenChange={setNewPlaylistOpen}
        onCreate={createPlaylist}
        songCount={target.length}
      />
    </>
  );
}
