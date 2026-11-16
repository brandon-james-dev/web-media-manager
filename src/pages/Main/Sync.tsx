import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uuidv7 } from "uuidv7";
import {
  Check,
  MonitorSmartphone,
  Plus,
  Usb,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "cn";
import { SidebarSyncedTracks, SidebarSyncQueue } from "@/components/library-sidebar";
import { OfflineCell } from "@/components/song-table/OfflineCell";
import { SongSearchPanel } from "@/components/song-search";
import { formatBytes } from "@/lib/sync/helpers";
import { songIdentity, trackIdentity } from "@/lib/sync/helpers";
import { hasConnectedDevice } from "@/lib/sync/helpers/markDeviceDisconnected";
import { notification$ } from "@/events/notification-events";
import { wmmBus } from "@/events";
import { AddDeviceDialog, SyncDeviceCard, SyncStat } from "@/components/sync";
import { useOfflineSongs, useSongs, useSourceKinds, useSync } from "@/hooks";
import { DevicePromptOrchestrator } from "@/lib/sync";
import { usbAvailable } from "@/lib/sync/usbAvailable";
import type { Song } from "@/models";

export function Sync({ compact = false }: { compact?: boolean } = {}) {
  //#region State
  const { devices, addDevice, queuedSongs, syncedSongIds, syncCompleted } =
    useSync();
  const { refreshDevices } = useSync();
  const { songs } = useSongs();
  const { offlineSongIds } = useOfflineSongs();
  const sourceKinds = useSourceKinds();
  const [addQuery, setAddQuery] = useState("");
  const usbSupported = usbAvailable();
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] =
    useState<boolean>(false);
  // The dialog is shown twice for a mass-storage device (e.g. an iPod):
  // first the USB picker (one user gesture), then the folder picker (a
  // second, separate gesture) — both pickers require their own transient
  // user activation and cannot be chained in a single handler.
  const [isFolderPromptOpen, setIsFolderPromptOpen] = useState(false);
  const [orchestrator] = useState(
    () => new DevicePromptOrchestrator(addDevice)
  );

  // The device card a synced track flies onto, and a counter bumped on each
  // landing so the card can splash. The refresh runs once per completed run,
  // after the last chip lands, so the contents match what was written.
  const deviceCardRef = useRef<HTMLDivElement>(null);
  const [splashToken, setSplashToken] = useState(0);
  const refreshedRun = useRef(false);

  const handleFlightArrive = useCallback(() => {
    setSplashToken((current) => current + 1);

    if (!syncCompleted || refreshedRun.current) return;

    refreshedRun.current = true;
    void refreshDevices().catch(() => undefined);
  }, [syncCompleted, refreshDevices]);

  useEffect(() => {
    if (!syncCompleted) refreshedRun.current = false;
  }, [syncCompleted]);

  // A song can only be queued when its bytes are reachable offline: local and
  // sync-device sources are always on disk, remote sources only once cached.
  const isAvailable = useCallback(
    (song: Song) => {
      const kind = sourceKinds.get(song.sourceId);
      if (kind === "local" || kind === "sync") return true;
      return offlineSongIds.has(song.id);
    },
    [sourceKinds, offlineSongIds]
  );

  // Library songs matching the queue search that are not already queued.
  // Capped so a one-letter query does not render the whole library.
  const addResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const queued = new Set(queuedSongs.map((song) => song.id));
    return songs
      .filter(
        (song) =>
          !queued.has(song.id) &&
          [song.title, song.artist, song.album, song.albumArtist, song.genre].some(
            (f) => f?.toLowerCase().includes(q)
          )
      )
      .slice(0, 50);
  }, [addQuery, songs, queuedSongs]);

  // Artists and albums whose name matches, so a whole record can be queued
  // without typing every track title.
  const addArtistResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const counts = new Map<string, number>();
    for (const song of songs) {
      if (!isAvailable(song)) continue;
      const artist = song.albumArtist || song.artist;
      if (!artist || !artist.toLowerCase().includes(q)) continue;
      counts.set(artist, (counts.get(artist) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, trackCount]) => ({ name, trackCount }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [addQuery, songs, isAvailable]);

  const addAlbumResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const counts = new Map<string, { artist?: string; trackCount: number }>();
    for (const song of songs) {
      if (!isAvailable(song)) continue;
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
  }, [addQuery, songs, isAvailable]);

  // Identities already on each device, so the search can mark a result as
  // present and refuse to queue it again.
  const onDeviceIdentities = useMemo(() => {
    const map = new Map<string, Set<string>>();

    for (const device of devices) {
      map.set(
        device.id,
        new Set(
          (device.media?.tracks ?? []).map((track) =>
            trackIdentity(track.title, track.album, track.artist)
          )
        )
      );
    }

    return map;
  }, [devices]);

  const addGenreResults = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (!q) return [];
    const counts = new Map<string, number>();
    for (const song of songs) {
      if (!isAvailable(song)) continue;
      if (!song.genre || !song.genre.toLowerCase().includes(q)) continue;
      counts.set(song.genre, (counts.get(song.genre) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, trackCount]) => ({ name, trackCount }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [addQuery, songs, isAvailable]);

  // Every library song by an artist, or on an album, so the add button can
  // queue the whole group in one call.
  function songIdsForGenre(genre: string): string[] {
    return songs
      .filter((song) => isAvailable(song) && song.genre === genre)
      .map((song) => song.id);
  }

  function songIdsForArtist(artist: string): string[] {
    return songs
      .filter(
        (song) =>
          isAvailable(song) &&
          (song.albumArtist || song.artist) === artist
      )
      .map((song) => song.id);
  }

  function songIdsForAlbum(album: string, artist?: string): string[] {
    return songs
      .filter(
        (song) =>
          isAvailable(song) &&
          song.album === album &&
          (song.albumArtist ?? song.artist) === artist
      )
      .map((song) => song.id);
  }
  //#endregion

  //#region Interactivity handlers
  // Gesture 1: USB picker (from the "USB Device" card click).
  async function handleUsbSelectedClick() {
    try {
      const usbInfo = await orchestrator.requestUsb();
      if (!usbInfo) return; // cancelled
      // Mass-storage devices (iPod) also need a directory picker — which
      // must be its own gesture, so show the folder prompt now.
      if (orchestrator.needsRoot) {
        setIsFolderPromptOpen(true);
        return;
      }
      await handleComplete();
    } catch (error) {
      handleError(error);
    }
  }

  // Gesture 2: directory picker (from the "Folder"/"Select iPod folder"
  // card click) — a separate click so the transient activation is still
  // valid for showDirectoryPicker.
  async function handleFolderSelectedClick() {
    setIsFolderPromptOpen(false);
    try {
      const root = await orchestrator.requestRoot();
      if (!root) return; // cancelled
      await handleComplete();
    } catch (error) {
      handleError(error);
    }
  }

  // No pickers: scan + persist with whatever was collected.
  async function handleComplete(): Promise<void> {
    try {
      const result = await orchestrator.complete();
      if (result) {
        notification$.next({
          id: uuidv7(),
          title: "Device added",
          detail: `${result.name} connected`,
          kind: "Device added",
          state: "completed",
        });
      }
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    notification$.next({
      id: uuidv7(),
      title: "Device add error",
      detail: errorMessage,
      kind: "Device add error",
      state: "error",
    });
  }
  //#endregion

  return (
    <div
      className={cn(
        compact
          ? "flex h-full min-h-0 flex-col p-1"
          : "flex h-full min-h-0 flex-col p-4"
      )}
    >
      <div
        className={cn(
          compact
            ? "flex min-h-0 flex-1 flex-col gap-1"
            : "mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4"
        )}
      >
        {compact ? (
          // Sidebar: add/refresh, the droppable device rows, then the queue
          // and the device's own tracks as two half-width tabs that fill the
          // rest of the panel.
          <>
            {!hasConnectedDevice(devices) ? (
              <div className="flex items-center gap-1 px-1 pb-1">
                <Button
                  variant="ghost"
                  className="min-w-0 flex-1 justify-start"
                  aria-label="Add sync device"
                  onClick={() => setIsAddDeviceDialogOpen(true)}
                  disabled={!usbSupported}
                  title={
                    usbSupported
                      ? undefined
                      : "WebUSB is not supported in this browser"
                  }
                >
                  <Plus />
                  Add Device
                </Button>
              </div>
            ) : (
              // A connected device replaces the add button. The row is the
              // device's identity; the queue below is the drop target.
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-1 rounded-md py-1.5 pl-2 pr-0.5 text-sm"
                >
                  <Usb
                    className={cn(
                      "size-4 shrink-0",
                      device.connected
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                    )}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {device.name}
                  </span>
                  {device.storage?.usedBytes != null && (
                    <span
                      className="shrink-0 text-xs text-muted-foreground tabular-nums"
                      title={
                        device.storage.capacityBytes != null
                          ? `${formatBytes(device.storage.usedBytes)} of ${formatBytes(device.storage.capacityBytes)} used`
                          : `${formatBytes(device.storage.usedBytes)} used`
                      }
                    >
                      {formatBytes(device.storage.usedBytes)}
                      {device.storage.capacityBytes != null &&
                        device.storage.capacityBytes > 0 && (
                          <>
                            {" / "}
                            {formatBytes(device.storage.capacityBytes)}
                            {" · "}
                            {Math.round(
                              (device.storage.usedBytes /
                                device.storage.capacityBytes) *
                                100
                            )}
                            %
                          </>
                        )}
                    </span>
                  )}
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      device.connected
                        ? "bg-primary"
                        : "bg-muted-foreground/40"
                    )}
                    aria-hidden="true"
                  />
                  {!device.connected && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      offline
                    </span>
                  )}
                </div>
              ))
            )}

            {devices.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No sync devices
              </div>
            )}

            {devices.length > 0 && (
              <Tabs
                defaultValue="queue"
                className="mt-1 min-h-0 flex-1 gap-1"
              >
                <TabsList className="w-full">
                  <TabsTrigger value="queue" className="flex-1">
                    Queue
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {queuedSongs.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="synced" className="flex-1">
                    Synced
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {devices[0]?.media?.tracks.length ?? 0}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent
                  value="queue"
                  className="min-h-0 overflow-hidden"
                >
                  <SidebarSyncQueue
                    deviceId={devices[0]!.id}
                    songs={queuedSongs}
                  />
                </TabsContent>

                <TabsContent
                  value="synced"
                  className="min-h-0 overflow-hidden"
                >
                  <SidebarSyncedTracks
                    deviceId={devices[0]!.id}
                    tracks={devices[0]?.media?.tracks ?? []}
                  />
                </TabsContent>
              </Tabs>
            )}
          </>
        ) : (
          <>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="flex size-11 shrink-0 items-center justify-center rounded-xl border text-accent"
              aria-hidden="true"
            >
              <MonitorSmartphone className="size-5" />
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">
                Sync Devices
              </h1>

              <div className="text-sm text-muted-foreground">
                Connect and manage portable music devices.
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setIsAddDeviceDialogOpen(true)}
              hidden={hasConnectedDevice(devices)}
              disabled={!usbSupported}
              title={
                usbSupported
                  ? undefined
                  : "WebUSB is not supported in this browser"
              }
            >
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>

        {devices.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full border text-accent"
                aria-hidden="true"
              >
                <MonitorSmartphone className="size-6" />
              </div>

              <div className="space-y-1">
                <div className="font-medium">No devices configured</div>

                <div className="text-sm text-muted-foreground">
                  Connect an iPod, Zune, or supported device to begin.
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setIsAddDeviceDialogOpen(true)}
                disabled={!usbSupported}
                title={
                  usbSupported
                    ? undefined
                    : "WebUSB is not supported in this browser"
                }
              >
                <Plus className="h-4 w-4" />
                Add Device
              </Button>
            </CardContent>
          </Card>
        )}

        {devices.map((device) => {
          const onDevice =
            onDeviceIdentities.get(device.id) ?? new Set<string>();

          // A group's add button is only disabled when every one of its songs
          // is already on this device.
          const artistAllOnDevice = new Map<string, boolean>();
          for (const artist of addArtistResults) {
            const groupSongs = songs.filter(
              (song) => (song.albumArtist || song.artist) === artist.name
            );
            artistAllOnDevice.set(
              artist.name,
              groupSongs.length > 0 &&
                groupSongs.every((song) => onDevice.has(songIdentity(song)))
            );
          }

          const albumAllOnDevice = new Map<string, boolean>();
          for (const album of addAlbumResults) {
            const groupSongs = songs.filter(
              (song) =>
                song.album === album.album &&
                (song.albumArtist ?? song.artist) === album.artist
            );
            albumAllOnDevice.set(
              album.album,
              groupSongs.length > 0 &&
                groupSongs.every((song) => onDevice.has(songIdentity(song)))
            );
          }

          const genreAllOnDevice = new Map<string, boolean>();
          for (const genre of addGenreResults) {
            const groupSongs = songs.filter((song) => song.genre === genre.name);
            genreAllOnDevice.set(
              genre.name,
              groupSongs.length > 0 &&
                groupSongs.every((song) => onDevice.has(songIdentity(song)))
            );
          }

          return (
          <div
            key={device.id}
            className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div ref={deviceCardRef} className="flex min-h-0 flex-col">
              <SyncDeviceCard device={device} splashToken={splashToken} />
            </div>

            <Card className="h-full min-h-0 pt-0">
              <CardHeader className="rounded-t-xl border-b bg-muted/50 py-2.5">
                <CardTitle>Queue</CardTitle>
              </CardHeader>

              <CardContent className="flex min-h-0 flex-1 flex-col gap-2 px-3">
                <div className="grid shrink-0 grid-cols-3 gap-1.5">
                  <SyncStat
                    label="Tracks"
                    value={queuedSongs.length}
                    className="px-1.5 py-1"
                  />

                  <SyncStat
                    label="Size"
                    value={formatBytes(
                      queuedSongs.reduce(
                        (sum, song) => sum + (song.filesize ?? 0),
                        0
                      )
                    )}
                    className="px-1.5 py-1"
                  />

                  <SyncStat
                    label="Synced"
                    value={
                      syncCompleted ? (
                        <span className="flex items-center gap-1">
                          <Check className="size-3.5" />
                          {syncedSongIds.length}
                        </span>
                      ) : (
                        syncedSongIds.length
                      )
                    }
                    className="px-1.5 py-1"
                  />
                </div>

                <SongSearchPanel
                  className="shrink-0"
                  query={addQuery}
                  onQueryChange={setAddQuery}
                  title="Add to queue"
                  ariaLabel="Search songs to add to the sync queue"
                  songs={addResults}
                  artists={addArtistResults}
                  albums={addAlbumResults}
                  genres={addGenreResults}
                  onAddSong={(song) =>
                    wmmBus.invoke("wmm.sync.queueSongs", {
                      songIds: [song.id],
                    })
                  }
                  onAddGenre={(genre) =>
                    wmmBus.invoke("wmm.sync.queueSongs", {
                      songIds: songIdsForGenre(genre.name),
                    })
                  }
                  onAddArtist={(artist) =>
                    wmmBus.invoke("wmm.sync.queueSongs", {
                      songIds: songIdsForArtist(artist.name),
                    })
                  }
                  onAddAlbum={(album) =>
                    wmmBus.invoke("wmm.sync.queueSongs", {
                      songIds: songIdsForAlbum(album.album, album.artist),
                    })
                  }
                  isSongAddDisabled={(song) =>
                    onDevice.has(songIdentity(song)) || !isAvailable(song)
                  }
                  songAddTitle={(song) => {
                    const title = song.title ?? song.filename;
                    if (onDevice.has(songIdentity(song))) {
                      return `${title} is already on the device`;
                    }
                    return isAvailable(song)
                      ? "Add to sync queue"
                      : `${title} is not available offline`;
                  }}
                  renderSongBadges={(song) => {
                    const isOnDevice = onDevice.has(songIdentity(song));

                    return (
                      <>
                        {isOnDevice && (
                          <span className="shrink-0 rounded-full border px-1.5 text-[10px] text-muted-foreground">
                            On device
                          </span>
                        )}

                        {!isOnDevice && !isAvailable(song) && (
                          <span className="shrink-0 rounded-full border border-amber-500/40 px-1.5 text-[10px] text-amber-500">
                            Needs download
                          </span>
                        )}
                      </>
                    );
                  }}
                  renderSongActions={(song) =>
                    onDevice.has(songIdentity(song)) ? null : (
                      <OfflineCell song={song} />
                    )
                  }
                  isGroupAddDisabled={({ name }) =>
                    artistAllOnDevice.get(name) === true ||
                    albumAllOnDevice.get(name) === true ||
                    genreAllOnDevice.get(name) === true
                  }
                />

                <div className="min-h-0 flex-1 overflow-hidden rounded-md border">
                  <SidebarSyncQueue
                    deviceId={device.id}
                    songs={queuedSongs}
                    showDropHint={false}
                    flightTarget={() =>
                      deviceCardRef.current?.getBoundingClientRect() ?? null
                    }
                    onFlightArrive={handleFlightArrive}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          );
        })}
          </>
        )}

        {/* Both views open the same dialogs; the compact view has no room
            for the page chrome but still needs the pickers. */}
        <AddDeviceDialog
          open={isAddDeviceDialogOpen}
          onOpenChange={setIsAddDeviceDialogOpen}
          onFolderSelected={() => handleFolderSelectedClick()}
          onUsbSelected={() => handleUsbSelectedClick()}
        />

        {/* Second gesture for mass-storage devices: pick the iPod folder. */}
        <AddDeviceDialog
          folderOnly
          open={isFolderPromptOpen}
          onOpenChange={setIsFolderPromptOpen}
          onFolderSelected={() => handleFolderSelectedClick()}
        />
      </div>
    </div>
  );
}
