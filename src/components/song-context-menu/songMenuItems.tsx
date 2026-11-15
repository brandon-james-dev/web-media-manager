import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import { wmmBus } from "@/events";
import {
  Download,
  HardDriveDownload,
  Heart,
  ListMusic,
  ListPlus,
  MinusCircle,
  Pause,
  Pen,
  PencilRuler,
  Play,
  PlusCircle,
} from "lucide-react";
import {
  useFavorites,
  useOfflineSongs,
  usePlayback,
  useSync,
} from "@/hooks";
import {
  albumOfflineBatchId,
  cacheSongsOffline,
  removeSongOffline,
} from "@/lib/offline";
import { getStore } from "@/core/system";
import { getPlaylistStore, getSourcesStore } from "@/core/ports";
import {
  addSongsToPlaylist,
  isPlaylistReadOnly,
  savePlaylist,
} from "@/core/playlists";
import type { MusicSource, Playlist, Song } from "@/models";
import { FAVORITES_PLAYLIST_ID } from "@/models";
import { toast } from "@/components/ui/toast";
import { getCurrentSelection, setCurrentSelection } from "./selection";

/** One actionable entry, rendered as a menu item or a drawer row. */
export interface SongMenuAction {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  /** Right-aligned detail, e.g. a playlist's track count. */
  trailing?: ReactNode;
  /** Omitted from the menu and the drawer when true. */
  hidden?: boolean;
  /** Rendered but not actionable, e.g. an action whose precondition fails. */
  disabled?: boolean;
}

/** A nested list: a submenu in the context menu, inline rows in the drawer. */
export interface SongMenuSubmenu {
  id: string;
  label: string;
  icon: ReactNode;
  actions: SongMenuAction[];
}

export interface SongMenuGroup {
  id: string;
  label?: string;
  hidden?: boolean;
  actions: SongMenuAction[];
  submenu?: SongMenuSubmenu;
}

export interface SongMenu {
  groups: SongMenuGroup[];
  /** The songs the actions apply to: the selection, or just this row. */
  target: Song[];
  newPlaylistOpen: boolean;
  setNewPlaylistOpen: (open: boolean) => void;
  createPlaylist: (name: string) => Promise<void>;
  /** Resolve the page selection when the surface opens. */
  onOpen: (open: boolean) => void;
}

/**
 * The song actions, defined once for every surface that offers them.
 *
 * The desktop context menu and the mobile drawer render the same groups, so
 * an action added here appears in both without touching either surface.
 */
export function useSongMenu(songs: Song[]): SongMenu {
  const { mode } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { queuedSongs, devices } = useSync();
  const { nowPlaying, isPlaying } = usePlayback();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { offlineSongIds } = useOfflineSongs();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  // Read when the surface opens (a page mounts many menus, so not per row).
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
   * Resolve the module-level selection snapshot at open time. The surface
   * instance may have mounted after the last selection change (the table
   * remounts rows on re-render), so its event subscription alone can't be
   * relied on.
   */
  function onOpen(open: boolean) {
    if (!open) return;
    getSourcesStore()
      .getSources()
      .then(setSources)
      .catch(() => { });
    const ids = getCurrentSelection();
    if (ids.length > 1) {
      Promise.all(ids.map((id) => getStore().get(id))).then((found) =>
        setSelectedSongs(found.filter((s): s is Song => Boolean(s)))
      );
    }
  }

  // The menu acts on the whole selection when the opened song is part of it;
  // opening outside the selection acts on that song alone.
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

  // Playlists synced from a read-only source can't take new songs, and the
  // reserved favorites playlist is already covered by the favorites action.
  const editablePlaylists = useMemo(
    () =>
      playlists.filter(
        (p) => p.id !== FAVORITES_PLAYLIST_ID && !isPlaylistReadOnly(p, sources)
      ),
    [playlists, sources]
  );

  // Playlists for the "Add to playlist" list, kept live while the surface is
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

    return target.every((s) => queuedIds.has(s.id));
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

  /** Report an action's outcome, from either the menu or the drawer. */
  const notify = useCallback(
    (
      type: "success" | "error" | "info",
      title: string,
      description?: string,
      actionProps?: ComponentPropsWithoutRef<"button">
    ) => {
      toast.add({ type, title, description, actionProps });
    },
    []
  );

  /** "Seed Track 1" for one song, "3 songs" for a selection. */
  const selectionLabel =
    target.length === 1 ? (song?.title ?? "1 song") : `${target.length} songs`;

  /** Add every selected song to an existing playlist. */
  async function addToPlaylist(playlistId: string) {
    await addSongsToPlaylist(
      playlistId,
      target.map((s) => s.id)
    );
  }

  /** Favorite every selected song, or unfavorite them when all already are. */
  async function toggleFavorites() {
    const allFavorite = target.every((s) => isFavorite(s.id));
    for (const s of target) {
      if (isFavorite(s.id) === allFavorite) await toggleFavorite(s.id);
    }
  }

  /**
   * Cache the selection for offline use, or drop it when every song is
   * already cached. Cached audio is what a sync job can read from a remote
   * source, and what lets a song play without the network.
   */
  async function toggleOffline() {
    const allCached = target.every((s) => offlineSongIds.has(s.id));

    if (allCached) {
      for (const s of target) await removeSongOffline(s.id);
      notify("success", "Removed download", selectionLabel);
      return;
    }

    let cached = 0;
    const failed: string[] = [];

    // Cache the selection as one worker batch. A selection drawn from a single
    // album reports under that album's id, so its card fills in; a mixed
    // selection gets its own batch id and leaves the album cards alone.
    const albums = new Set(target.map((s) => `${s.album}\u0000${s.artist}`));
    const batchId =
      albums.size === 1
        ? albumOfflineBatchId({
            title: target[0]?.album ?? "",
            artist: target[0]?.artist ?? "",
          })
        : `selection:${target.map((s) => s.id).join(",")}`;

    const result = await cacheSongsOffline(target, batchId);
    cached = result.cached;
    failed.push(...result.failed);

    if (cached > 0) {
      notify(
        "success",
        `Available offline`,
        `${cached} song${cached === 1 ? "" : "s"} cached.`
      );
    }

    if (failed.length > 0) {
      notify(
        "error",
        `Could not cache ${failed.length} song${failed.length === 1 ? "" : "s"}`,
        failed.slice(0, 3).join(", ")
      );
    }
  }

  /**
   * Create a playlist from the selection. Playlists live in the app's own
   * store; a source that can persist playlists also gets a written copy
   * (savePlaylist decides that from the source's capabilities).
   */
  async function createPlaylist(name: string) {
    const saved = await savePlaylist({
      name,
      songs: target.map((s) => ({ songId: s.id, addedAt: Date.now() })),
    });
    notify("success", `Created ${saved.name}`, selectionLabel, {
      children: "View",
      onClick: () => navigate(`/playlists?playlist=${saved.id}`),
    });
  }

  const isPlaybackHidden =
    (mode !== undefined && mode !== "playback") || isInSyncPage;

  const isEditHidden = mode !== "edit" || isInSyncPage;
  const hasConnectedDevices = devices.length > 0;

  const groups = useMemo<SongMenuGroup[]>(() => {
    const allFavorite = target.every((s) => isFavorite(s.id));
    const allOffline = target.every((s) => offlineSongIds.has(s.id));

    return [
      {
        id: "playback",
        label: "Playback",
        hidden: isPlaybackHidden,
        actions: [
          {
            id: "play",
            label: isNowPlaying
              ? "Pause"
              : target.length === 1
                ? "Play Song"
                : "Play All",
            icon: isNowPlaying ? (
              <Pause className="fill-foreground" />
            ) : (
              <Play className="fill-foreground" />
            ),
            onSelect: () =>
              onItemClick(() =>
                isNowPlaying
                  ? wmmBus.invoke("wmm.playback.playpause")
                  : song &&
                  wmmBus.invoke("wmm.playback.playSong", {
                    songId: song.id,
                  })
              ),
          },
          {
            id: "queue",
            label: "Add To Queue",
            icon: <PlusCircle />,
            onSelect: () =>
              onItemClick(() =>
                wmmBus.invoke("wmm.playback.addToQueue", {
                  songIds: target.map((s) => s.id),
                })
              ),
          },
        ],
      },
      {
        id: "playlist",
        label: "Playlist",
        hidden: isPlaybackHidden,
        actions: [
          {
            id: "favorites",
            label: allFavorite ? "Remove From Favorites" : "Add To Favorites",
            icon: <Heart />,
            onSelect: () => void toggleFavorites(),
          },
        ],
        submenu: {
          id: "add-to-playlist",
          label: "Add To Playlist",
          icon: <ListPlus />,
          actions: [
            ...editablePlaylists.map((playlist) => ({
              id: `playlist:${playlist.id}`,
              label: playlist.name,
              icon: <ListMusic />,
              trailing: (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {playlist.songs.length}
                </span>
              ),
              onSelect: () => {
                void addToPlaylist(playlist.id)
                  .then(() =>
                    notify(
                      "success",
                      `Added to ${playlist.name}`,
                      selectionLabel
                    )
                  )
                  .catch(() =>
                    notify("error", `Could not add to ${playlist.name}`)
                  );
              },
            })),
            {
              id: "new-playlist",
              label: "New Playlist...",
              icon: <PlusCircle />,
              onSelect: () => setNewPlaylistOpen(true),
            },
          ],
        },
      },
      {
        id: "editing",
        label: "Editing",
        hidden: isEditHidden,
        actions: [
          {
            id: "quick-edit",
            label: "Quick Edit",
            icon: <Pen />,
            onSelect: () =>
              onItemClick(() =>
                wmmBus.invoke("wmm.library.song.quickEdit", {
                  songIds: target.map((s) => s.id),
                })
              ),
          },
          {
            id: "advanced-edit",
            label: "Advanced Edit",
            icon: <PencilRuler />,
            onSelect: () =>
              song &&
              wmmBus.invoke("wmm.library.song.edit", { songId: song.id }),
          },
        ],
      },
      {
        id: "offline",
        label: "Offline",
        actions: [
          {
            id: "cache-offline",
            label: allOffline ? "Remove Download" : "Make Available Offline",
            icon: allOffline ? <HardDriveDownload /> : <Download />,
            onSelect: () => void toggleOffline(),
          },
        ],
      },
      {
        id: "sync",
        label: "Sync",
        // Shown whenever a device is connected: queueing is the common case,
        // and removing only appears once the songs are actually queued.
        hidden: !hasConnectedDevices,
        actions: [
          {
            id: "queue-sync",
            label: "Add To Sync Queue",
            icon: <PlusCircle />,
            // Only downloaded audio can be written to a device, so the action
            // stays visible but disabled for songs that are not cached.
            hidden: isQueued,
            disabled: !allOffline,
            onSelect: () =>
              onItemClick(() =>
                wmmBus.invoke("wmm.sync.queueSongs", {
                  songIds: target.map((s) => s.id),
                })
              ),
          },
          {
            id: "dequeue",
            label: "Remove From Queue",
            icon: <MinusCircle />,
            hidden: !isQueued,
            onSelect: () =>
              onItemClick(() =>
                wmmBus.invoke("wmm.sync.dequeueSongs", {
                  songIds: target.map((s) => s.id),
                })
              ),
          },
        ],
      },
    ];
  }, [
    editablePlaylists,
    hasConnectedDevices,
    isEditHidden,
    isFavorite,
    isNowPlaying,
    isPlaybackHidden,
    isQueued,
    notify,
    offlineSongIds,
    selectionLabel,
    song,
    target,
  ]);

  return {
    groups,
    target,
    newPlaylistOpen,
    setNewPlaylistOpen,
    createPlaylist,
    onOpen,
  };
}
