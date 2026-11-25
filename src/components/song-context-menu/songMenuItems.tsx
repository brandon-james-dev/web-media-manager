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
  Eye,
  EyeOff,
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
  Trash2,
} from "lucide-react";
import {
  useFavorites,
  useHiddenSongs,
  useOfflineSongs,
  usePlayback,
  useSourceKinds,
  useSync,
} from "@/hooks";
import {
  albumOfflineBatchId,
  cacheSongsOffline,
  isAlwaysOfflineKind,
  removeSongOffline,
} from "@/lib/offline";
import { hideTracks, unhideTracks } from "@/lib/hidden-songs";
import { getStore } from "@/core/system";
import { getPlaylistStore, getSourcesStore } from "@/core/ports";
import {
  addSongsToPlaylist,
  isPlaylistReadOnly,
  removeSongsFromPlaylist,
  savePlaylist,
} from "@/core/playlists";
import type { MusicSource, Playlist, Song } from "@/models";
import { FAVORITES_PLAYLIST_ID } from "@/models";
import { toast } from "@/components/ui/toast";
import { useTranslation } from "@/i18n";
import { getCurrentSelection } from "./selection";

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
 * an action added here appears in both without touching either surface. A
 * `playlistId` adds the "remove from playlist" action for that playlist,
 * disabled while its source keeps it read-only.
 */
export function useSongMenu(songs: Song[], playlistId?: string): SongMenu {
  const { mode } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { queuedSongs, devices, removeTracksFromDevice } = useSync();
  const { nowPlaying, isPlaying } = usePlayback();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { offlineSongIds } = useOfflineSongs();
  const { hiddenSongIds } = useHiddenSongs();
  const sourceKinds = useSourceKinds();
  const { t } = useTranslation();

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  /** Read when the surface opens: a page mounts many menus, not one per row. */
  const [sources, setSources] = useState<MusicSource[]>([]);
  /**
   * The page's current multi-selection, resolved to songs. The row only hands
   * the menu the one right-clicked song, so the selection event is the only
   * channel that knows about a multi-select.
   */
  const [selectedSongs, setSelectedSongs] = useState<Song[]>([]);

  const song = songs[0];

  useEffect(() => {
    let cancelled = false;
    const resolve = (ids: string[]) => {
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

  /**
   * The menu acts on the whole selection when the opened song is part of it;
   * opening outside the selection acts on that song alone.
   */
  const target = useMemo(() => {
    if (
      selectedSongs.length > 1 &&
      song &&
      selectedSongs.some((s) => s.id === song.id)
    ) {
      return selectedSongs;
    }
    return songs;
  }, [selectedSongs, songs, song]);

  /** Advanced edit needs every targeted song's source to allow write-back. */
  const targetEditable = useMemo(
    () =>
      target.every((s) =>
        sources.some(
          (source) =>
            source.id === s.sourceId && source.capabilities.metadataWrite
        )
      ),
    [target, sources]
  );

  /**
   * Playlists synced from a read-only source can't take new songs, and the
   * reserved favorites playlist is already covered by the favorites action.
   */
  const editablePlaylists = useMemo(
    () =>
      playlists.filter(
        (p) => p.id !== FAVORITES_PLAYLIST_ID && !isPlaylistReadOnly(p, sources)
      ),
    [playlists, sources]
  );

  /**
   * Playlists for the "Add to playlist" list, kept live while the surface is
   * mounted so a playlist created elsewhere shows up without a reload.
   */
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

  /**
   * The playlist the surface was opened from, when it names one, so the menu
   * can take songs back out of it.
   */
  const currentPlaylist = useMemo(
    () => playlists.find((playlist) => playlist.id === playlistId),
    [playlists, playlistId]
  );
  const playlistReadOnly =
    currentPlaylist !== undefined &&
    isPlaylistReadOnly(currentPlaylist, sources);

  const isQueued = useMemo(() => {
    const queuedIds = new Set(queuedSongs.map((x) => x.id));

    return target.every((s) => queuedIds.has(s.id));
  }, [queuedSongs, target]);

  const isNowPlaying = useMemo(
    () => song && nowPlaying?.id === song.id && isPlaying,
    [song, nowPlaying, isPlaying]
  );

  const isInSyncPage = useMemo(() => pathname.includes("sync"), [pathname]);

  const onItemClick = useCallback(
    (callback: () => void) => {
      wmmBus.publish("wmm.ui.selectionChanged", {
        songIds: target.map((x) => x.id),
      });
      callback();
    },
    [target]
  );

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
    target.length === 1
      ? (song?.title ?? t("library.songCount", [1]))
      : t("library.songCount", [target.length]);

  /** "Artist - Title" for one song, "3 songs" for a selection. */
  const trackLabel =
    target.length === 1
      ? t("library.trackLabel", [
          song?.albumArtist || song?.artist || "",
          song?.title ?? "",
        ])
      : t("library.songCount", [target.length]);

  /**
   * Device tracks are read from the device on demand and never imported into
   * the library, so the store's hidden filter never sees them — hiding one
   * would write a row that changes nothing. The action is withheld instead.
   */
  const isDeviceTrack = useMemo(() => {
    if (target.length === 0) return false;
    const deviceIds = new Set(devices.map((device) => device.id));
    return target.every((s) => deviceIds.has(s.sourceId));
  }, [devices, target]);

  /**
   * The device tracks behind the selection, grouped by device.
   *
   * A device track is identified on the device by its numeric `SyncTrack.id`,
   * which the song row does not carry: the row keeps the device path in
   * `relativePath`, so the track is resolved by matching that path. A song
   * whose device is unplugged, or whose path no longer exists, is skipped
   * rather than failing the whole removal.
   */
  const deviceRemoval = useMemo(() => {
    const byDevice = new Map<
      string,
      { device: (typeof devices)[number]; trackIds: number[] }
    >();

    for (const s of target) {
      const device = devices.find((candidate) => candidate.id === s.sourceId);
      if (!device?.connected) continue;

      const track = (device.media?.tracks ?? []).find(
        (candidate) => candidate.path === s.relativePath
      );
      if (!track) continue;

      const entry = byDevice.get(device.id) ?? { device, trackIds: [] };
      entry.trackIds.push(track.id);
      byDevice.set(device.id, entry);
    }

    return byDevice;
  }, [devices, target]);

  /** Delete the selection from the device it lives on. */
  const removeFromDevice = useCallback(async () => {
    for (const { device, trackIds } of deviceRemoval.values()) {
      await removeTracksFromDevice(device, trackIds);
    }
  }, [deviceRemoval, removeTracksFromDevice]);

  /** Add every selected song to an existing playlist. */
  const addToPlaylist = useCallback(
    async (playlistId: string) => {
      await addSongsToPlaylist(
        playlistId,
        target.map((s) => s.id)
      );
    },
    [target]
  );

  /** Favorite every selected song, or unfavorite them when all already are. */
  const toggleFavorites = useCallback(async () => {
    const allFavorite = target.every((s) => isFavorite(s.id));
    for (const s of target) {
      if (isFavorite(s.id) === allFavorite) await toggleFavorite(s.id);
    }
  }, [target, isFavorite, toggleFavorite]);

  /**
   * Cache the selection for offline use, or drop it when every song is
   * already cached. Cached audio is what a sync job can read from a remote
   * source, and what lets a song play without the network.
   */
  const toggleOffline = useCallback(async () => {
    const allCached = target.every((s) => offlineSongIds.has(s.id));

    if (allCached) {
      for (const s of target) await removeSongOffline(s.id);
      notify("success", t("library.removedDownload"), selectionLabel);
      return;
    }

    let cached = 0;
    const failed: string[] = [];

    /**
     * Cache the selection as one worker batch. A selection drawn from a single
     * album reports under that album's id, so its card fills in; a mixed
     * selection gets its own batch id and leaves the album cards alone.
     */
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
        t("library.availableOffline"),
        t("library.songsCached", [cached])
      );
    }

    if (failed.length > 0) {
      notify(
        "error",
        t("library.cacheFailedCount", [failed.length]),
        failed.slice(0, 3).join(", ")
      );
    }
  }, [target, offlineSongIds, notify, selectionLabel, t]);

  /**
   * Hide the selection from the library, or bring it back when every song is
   * already hidden. Hidden songs are filtered out of every browse list, so the
   * page selection is cleared: the rows are about to disappear.
   */
  const toggleHidden = useCallback(async () => {
    const allHidden = target.every((s) => hiddenSongIds.has(s.id));

    if (allHidden) {
      await unhideTracks(target.map((s) => s.id));
      notify(
        "success",
        t("library.tracksUnhidden", [target.length]),
        trackLabel
      );
      return;
    }

    await hideTracks(
      target.map((s) => ({ songId: s.id, sourceId: s.sourceId }))
    );
    wmmBus.publish("wmm.ui.selectionChanged", { songIds: [] });
    notify("success", t("library.tracksHidden", [target.length]), trackLabel);
  }, [target, hiddenSongIds, notify, trackLabel, t]);

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
    notify("success", t("playlist.created", [saved.name]), selectionLabel, {
      children: t("common.view"),
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
    const allHidden = target.every((s) => hiddenSongIds.has(s.id));

    return [
      {
        id: "playback",
        label: t("playback.section"),
        hidden: isPlaybackHidden,
        actions: [
          {
            id: "play",
            label: isNowPlaying
              ? t("playback.pause")
              : target.length === 1
                ? t("playback.playSong")
                : t("playback.playAll"),
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
            label: t("playback.addToQueue"),
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
        label: t("playlist.section"),
        hidden: isPlaybackHidden,
        actions: [
          {
            id: "favorites",
            label: allFavorite
              ? t("library.unfavoriteSelection")
              : t("library.favoriteSelection"),
            icon: <Heart />,
            onSelect: () => void toggleFavorites(),
          },
          {
            id: "remove-from-playlist",
            label: t("playlist.removeTrack"),
            icon: <MinusCircle />,
            hidden: playlistId === undefined,
            disabled: playlistReadOnly,
            onSelect: () => {
              if (playlistId === undefined) return;
              void removeSongsFromPlaylist(
                playlistId,
                target.map((s) => s.id)
              );
            },
          },
        ],
        submenu: {
          id: "add-to-playlist",
          label: t("playlist.addSelection"),
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
                      t("playlist.addedTo", [playlist.name]),
                      selectionLabel
                    )
                  )
                  .catch(() =>
                    notify("error", t("playlist.addFailed", [playlist.name]))
                  );
              },
            })),
            {
              id: "new-playlist",
              label: t("playlist.create"),
              icon: <PlusCircle />,
              onSelect: () => setNewPlaylistOpen(true),
            },
          ],
        },
      },
      {
        id: "editing",
        label: t("library.editing"),
        hidden: isEditHidden,
        actions: [
          {
            id: "quick-edit",
            label: t("library.quickEdit"),
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
            label: t("library.advancedEdit"),
            icon: <PencilRuler />,
            disabled: !targetEditable,
            onSelect: () =>
              song &&
              wmmBus.invoke("wmm.library.song.edit", { songId: song.id }),
          },
        ],
      },
      {
        id: "offline",
        label: t("library.offline"),
        /**
         * A local folder and a sync device already hold their own audio, so
         * there is nothing to download and nothing to remove.
         */
        hidden: target.every((s) =>
          isAlwaysOfflineKind(sourceKinds.get(s.sourceId))
        ),
        actions: [
          {
            id: "cache-offline",
            label: allOffline
              ? t("library.removeDownload")
              : t("library.makeAvailableOffline"),
            icon: allOffline ? <HardDriveDownload /> : <Download />,
            onSelect: () => void toggleOffline(),
          },
        ],
      },
      {
        id: "sync",
        label: t("sync.title"),
        /**
         * Shown whenever a device is connected: queueing is the common case,
         * and removing only appears once the songs are actually queued.
         */
        hidden: !hasConnectedDevices,
        actions: [
          {
            id: "queue-sync",
            label: t("sync.addToQueue"),
            icon: <PlusCircle />,
            /**
             * Only downloaded audio can be written to a device, so the action
             * stays visible but disabled for songs that are not cached.
             */
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
            label: t("sync.removeFromQueue"),
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
      {
        id: "hidden",
        label: t("library.visibility"),
        hidden: isDeviceTrack,
        actions: [
          {
            id: "hide-tracks",
            label: allHidden
              ? t("library.unhideSelection", [target.length])
              : t("library.hideSelection", [target.length]),
            icon: allHidden ? <Eye /> : <EyeOff />,
            onSelect: () => void toggleHidden(),
          },
        ],
      },
      {
        id: "device",
        label: t("sync.title"),
        hidden: !isDeviceTrack,
        actions: [
          {
            id: "remove-from-device",
            label:
              target.length === 1
                ? t("sync.removeFromDevice")
                : t("sync.removeSelectedFromDevice", [target.length]),
            icon: <Trash2 />,
            disabled: deviceRemoval.size === 0,
            onSelect: () => void removeFromDevice(),
          },
        ],
      },
    ].map((group) => ({
      // A device track is read from the device, never imported into the
      // library, so the library actions do not apply to it: favoriting,
      // playlists, editing, offline caching, queueing and hiding all write
      // rows the device would never see. Only the device group survives, so
      // the menu offers the one action that does something.
      ...group,
      hidden: isDeviceTrack ? group.id !== "device" : group.hidden,
    }));
  }, [
    editablePlaylists,
    hasConnectedDevices,
    isDeviceTrack,
    deviceRemoval,
    removeFromDevice,
    isEditHidden,
    isFavorite,
    isNowPlaying,
    isPlaybackHidden,
    isQueued,
    notify,
    offlineSongIds,
    hiddenSongIds,
    playlistId,
    playlistReadOnly,
    sourceKinds,
    selectionLabel,
    song,
    t,
    target,
    targetEditable,
    toggleOffline,
    toggleHidden,
    addToPlaylist,
    toggleFavorites,
    onItemClick,
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
