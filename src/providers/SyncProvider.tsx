import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Song, SyncDevice } from "@/models";
import { SyncContext } from "@/hooks";
import { commandDispatcher, wmmBus } from "@/events";
import { getStore } from "@/core/system";
import { getJobService } from "@/core/jobs";
import type { BackgroundJob } from "@/events/background-job-events";
import { getPlaylists } from "@/core/playlists";
import {
  SyncService,
  deviceTrackIdentities,
  isSongOnEveryDevice,
  type UsbDeviceInfo,
} from "@/lib/sync";
import { isOnDevice, type SyncSongOutcome } from "@/lib/sync/writers/ISyncStrategy";
import { markDeviceDisconnected } from "@/lib/sync/helpers/markDeviceDisconnected";
import { createDeviceListSync } from "@/lib/sync/helpers/deviceListSync";
import { startDeviceSync } from "@/lib/sync/helpers/startDeviceSync";
import {
  clearDeviceArtwork,
  setDeviceArtwork,
} from "@/lib/sync/deviceArtwork";
import type { DeviceSyncResult } from "@/workers/shared/runDeviceSync";
import type { DeviceRemoveResult } from "@/workers/shared/runDeviceRemove";
import { runJobWithProgress } from "@/lib/jobs/runJobWithProgress";
import { notification$ } from "@/events/notification-events";
import { i18n } from "@/i18n";
import {
  getOfflineSongIdsSnapshot,
  reloadOfflineSongIds,
} from "@/lib/offline";
import { uuidv7 } from "uuidv7";

export function SyncProvider({ children }: { children: ReactNode }) {
  //#region State
  const [devices, setDevices] = useState<SyncDevice[]>([]);

  const [queuedSongs, setQueuedSongs] = useState<Song[]>([]);

  // How far the running sync has got, or null when nothing is syncing. The
  // sync button swaps its label for this, so the run needs no separate modal.
  const [syncProgress, setSyncProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);

  // Tokens for every mounted sync surface (the sidebar queue and the sync
  // page). A sync that finishes while this is empty has no visible progress
  // to land in, so it reports through a notification instead.
  const syncUiTokens = useRef(new Set<symbol>());

  // The worker job currently writing to a device, so progress and completion
  // events from other jobs are ignored.
  const activeSyncJobId = useRef<string | null>(null);

  // Mirror of `queuedSongs` read synchronously by `queueSongs`. Two drops in
  // the same tick would both see the pre-render state and queue the same song
  // twice, so the dedupe reads and writes this ref instead.
  const queuedSongsRef = useRef<Song[]>([]);
  // Guards the device list against a refresh that started before an add or an
  // unplug resolving afterwards and overwriting the newer state.
  const deviceListSync = useRef(
    createDeviceListSync((next) => setDevices(next))
  );
  const [isSyncing, setIsSyncing] = useState(false);

  // Queued songs now on the device (written, or already there), filled in as
  // the worker reports each one. The queue shows them ticked and disabled.
  const [syncedSongIds, setSyncedSongIds] = useState<string[]>([]);

  // True once a run finishes. The queue is kept so its ticks stay visible;
  // the sync button becomes "Sync completed" and clears it on confirmation.
  const [syncCompleted, setSyncCompleted] = useState(false);
  //#endregion

  //#region Functions
  /**
   * Register the cover art of every connected device track, keyed by the same
   * namespaced song id the library uses. The library's artwork lookup reads
   * the `songArtwork` table, which holds nothing for a device, so without this
   * every device track rendered a blank tile.
   */
  useEffect(() => {
    clearDeviceArtwork();

    for (const device of devices) {
      for (const track of device.media?.tracks ?? []) {
        if (track.artwork) {
          setDeviceArtwork(`${device.id}:${track.id}`, track.artwork);
        }
      }
    }
  }, [devices]);
  /**
   * Add songs to the queue, skipping anything already stored on a connected
   * device. The queue is device-agnostic, so a song counts as present when
   * any connected device has it. Returns the songs actually queued.
   */
  const queueSongs = useCallback(
    async (songs: Song[]): Promise<Song[]> => {
      // A song is only unqueueable when *every* connected device already has
      // it. Collecting one shared set meant a song on the Zune 8 could never
      // be queued for a Zune 120 that lacked it, so the queue came out empty
      // and the sync copied nothing.
      const perDeviceIdentities = devices
        .filter((x) => x.connected)
        .map((device) => deviceTrackIdentities(device));

      const onEveryDevice = (song: Song): boolean =>
        isSongOnEveryDevice(song, perDeviceIdentities);

      const alreadyQueued = new Set(
        queuedSongsRef.current.map((song) => song.id)
      );

      // Only audio that is already on this device can be written to a device:
      // a sync job runs in a worker, where a remote source's credentials are
      // out of reach. A cached song qualifies, and so does a song whose source
      // holds its own audio (a local folder, or another sync device).
      await reloadOfflineSongIds();
      const offlineIds = getOfflineSongIdsSnapshot();

      // Songs skipped because they are already queued are not "on device";
      // only the latter earns the notification below.
      const onDevice = songs.filter(
        (song) => !alreadyQueued.has(song.id) && onEveryDevice(song)
      );

      const notOffline = songs.filter(
        (song) =>
          !alreadyQueued.has(song.id) &&
          !onEveryDevice(song) &&
          !offlineIds.has(song.id)
      );

      const added = songs.filter(
        (song) =>
          !alreadyQueued.has(song.id) &&
          !onEveryDevice(song) &&
          offlineIds.has(song.id)
      );

      if (added.length > 0) {
        const next = [...queuedSongsRef.current, ...added];
        queuedSongsRef.current = next;
        setQueuedSongs(next);
        // New work after a finished run: the button goes back to "Sync".
        setSyncCompleted(false);
        wmmBus.publish("wmm.sync.queued", {
          songIds: added.map((s) => s.id),
        });
      }

      const skipped = onDevice.length;

      if (skipped > 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Queue Skipped",
          state: "completed",
          title: i18n.t("notification.alreadyOnDevice"),
          detail: i18n.t("notification.skippedOnDevice", [skipped]),
        });
      }

      if (notOffline.length > 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Queue Skipped",
          state: "error",
          title: i18n.t("notification.notAvailableOffline"),
          detail: i18n.t("notification.skippedNotOffline", [
            notOffline.length,
          ]),
        });
      }

      return added;
    },
    [devices]
  );


  const clearQueue = useCallback(() => {
    queuedSongsRef.current = [];
    setQueuedSongs([]);
    setSyncedSongIds([]);
    setSyncCompleted(false);
  }, []);

  const syncService = useMemo(() => new SyncService(), []);

  /**
   * Mark a sync surface as mounted. Returns the cleanup that unmarks it, so a
   * component can hand it straight to `useEffect`.
   */
  const registerSyncUi = useCallback(() => {
    const token = Symbol("sync-ui");
    syncUiTokens.current.add(token);

    return () => {
      syncUiTokens.current.delete(token);
    };
  }, []);

  const refreshDevices = useCallback(async () => {
    // loadPersistedDevices only returns devices matching a currently
    // connected USB device, so disconnected/absent ones are not shown.
    //
    // The result is applied through the revision guard: a scan that started
    // before `addDevice` appended the picked device must not replace the list
    // with its pre-add snapshot, which made a just-added device disappear.
    await deviceListSync.current.refresh(() =>
      syncService.loadPersistedDevices()
    );
  }, [syncService]);

  const syncQueue = useCallback(
    async (syncDevice: SyncDevice) => {
      // Read the queue through the ref: this callback is created once per
      // render, and the run needs the list as it is when the sync starts.
      const songsToSync = [...queuedSongsRef.current];

      if (songsToSync.length === 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title: i18n.t("notification.noSongsToSync"),
          detail: i18n.t("notification.noSongsToSyncDetail"),
        });
        return;
      }

      // Raise the flag before the queue read: `getPlaylists()` is async, and
      // setting it afterwards meant a throw there left the UI with no syncing
      // indicator and no error.
      setIsSyncing(true);
      setSyncCompleted(false);
      setSyncedSongIds([]);
      setSyncProgress({ completed: 0, total: songsToSync.length });

      const playlists = await getPlaylists();

      // The write runs in the worker pool: the device handle and the queue
      // are structured-cloneable, so the worker opens the device itself and
      // the main thread stays responsive while tracks are copied.
      const jobId = uuidv7();
      activeSyncJobId.current = jobId;

      getJobService().enqueue(
        {
          type: "Device Sync",
          payload: { device: syncDevice, songs: songsToSync, playlists },
        },
        jobId
      );
    },
    []
  );

  /**
   * Land a finished worker sync: rescan the device so its listing shows what
   * was written, mark the run completed (the queue stays, ticked), and report
   * songs that could not be written.
   */
  const finishSync = useCallback(
    async (job: BackgroundJob) => {
      const device = job.payload?.device as SyncDevice | undefined;
      const result = job.result as DeviceSyncResult | undefined;

      setIsSyncing(false);
      setSyncProgress(null);

      // A cancelled run leaves the queue in place for a retry. The worker
      // reports a cancel as a normal completion with `cancelled: true`, so
      // both shapes land here.
      if (job.state === "canceled" || result?.cancelled) {
        // Songs written before the cancel are on the device now.
        void refreshDevices().catch(() => undefined);
        if (syncUiTokens.current.size === 0) {
          notification$.next({
            id: uuidv7(),
            kind: "Sync Device",
            state: "canceled",
            title: i18n.t("notification.syncCanceled"),
            detail: i18n.t("notification.syncCanceledDetail", [
              device?.name ?? i18n.t("notification.theDevice"),
            ]),
          });
        }
        return;
      }

      if (job.state !== "completed") {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title: i18n.t("notification.syncError"),
          detail: i18n.t("notification.syncErrorDetail", [
            device?.name ?? i18n.t("notification.theDevice"),
          ]),
        });
        return;
      }

      const summary = result?.summary ?? {
        added: [],
        unverified: [],
        alreadyPresent: [],
        skipped: [],
      };

      // The queue is kept: its ticks show what landed, and the button now
      // offers to clear it (behind a confirmation) as "Sync completed".
      setSyncCompleted(true);

      // Rescan so the device card reflects the tracks and playlists just
      // written to the device instead of the snapshot taken when it was
      // first detected. The in-session directory handle still holds read
      // permission, so this does not prompt the user for a folder.
      try {
        await refreshDevices();
      } catch (error) {
        notification$.next({
          id: uuidv7(),
          kind: "Device Refresh Error",
          state: "error",
          title: i18n.t("notification.deviceRefreshError"),
          detail: i18n.t("notification.deviceRefreshErrorDetail", [
            String(error),
          ]),
        });
      }

      const name = device?.name ?? i18n.t("notification.theDevice");

      // Songs that could not be read are reported even with the sync UI on
      // screen: a run that silently left songs out looked like a success.
      if (summary.skipped.length > 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title:
            summary.added.length === 0 && summary.alreadyPresent.length === 0
              ? i18n.t("notification.nothingWritten", [name])
              : i18n.t("notification.tracksNotSynced", [
                  summary.skipped.length,
                ]),
          detail: i18n.t("notification.tracksSkippedDetail", [
            summary.skipped.length,
          ]),
        });
        return;
      }

      // Written, but not found when the device was re-read. Reported for the
      // same reason as skipped songs: the write did not stick.
      if (summary.unverified.length > 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title: i18n.t("notification.tracksNotFound", [
            summary.unverified.length,
            name,
          ]),
          detail: i18n.t("notification.tracksUnverifiedDetail", [
            summary.unverified.length,
          ]),
        });
        return;
      }

      // With no sync surface mounted there is nothing on screen showing the
      // result, so report it as a notification instead.
      if (syncUiTokens.current.size === 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device",
          state: "completed",
          title: i18n.t("notification.syncedTo", [name]),
          detail: i18n.t("notification.tracksWritten", [
            summary.added.length,
          ]),
        });
      }
    },
    [refreshDevices]
  );

  // Follow the worker job: its progress fills the sync button, and its
  // completion clears the queue and rescans the device.
  useEffect(() => {
    const offProgress = getJobService().onJobProgress((event) => {
      if (event.jobType !== "Device Sync") return;
      if (event.jobId !== activeSyncJobId.current) return;

      const { index, total, data } = event.payload ?? {};

      if (typeof index === "number" && typeof total === "number") {
        setSyncProgress({ completed: index, total });
      }

      // Tick off each song once it is confirmed on the device. A song that was
      // only written, or that could not be read, stays unticked so the queue
      // shows exactly what landed.
      const outcome = data as SyncSongOutcome | undefined;
      if (outcome && isOnDevice(outcome.status)) {
        setSyncedSongIds((current) =>
          current.includes(outcome.songId)
            ? current
            : [...current, outcome.songId]
        );
      }
    });

    const offCompleted = getJobService().onJobCompleted((job) => {
      if (job.type !== "Device Sync") return;
      if (job.id !== activeSyncJobId.current) return;

      activeSyncJobId.current = null;
      void finishSync(job);
    });

    return () => {
      offProgress();
      offCompleted();
    };
  }, [finishSync]);

  /**
   * Stop the running sync. The worker notices on its next progress report and
   * stops writing; the queue is left in place so the run can be retried.
   */
  const cancelSync = useCallback(() => {
    const jobId = activeSyncJobId.current;
    if (!jobId) return;

    getJobService().cancelJob(jobId);
  }, []);

  /**
   * Delete tracks from a device by their on-device ids, then rescan so the
   * card, the queue filter, and the nav badge all see the new library.
   *
   * Runs as a worker job so a large removal reports per-track progress and
   * does not block the main thread.
   */
  const removeTracksFromDevice = useCallback(
    async (syncDevice: SyncDevice, trackIds: number[]) => {
      if (trackIds.length === 0) return;

      try {
        const result = await runJobWithProgress<DeviceRemoveResult>({
          type: "Device Remove",
          payload: { device: syncDevice, trackIds },
          kind: "Device Remove",
          title: i18n.t("notification.removingTracks"),
          bulk: trackIds.length > 1,
          readResult: (raw) => {
            const value = raw as Partial<DeviceRemoveResult> | undefined;

            return {
              cancelled: value?.cancelled ?? false,
              removed: value?.removed ?? 0,
            };
          },
        });

        if (result.cancelled) return;
      } catch (error) {
        notification$.next({
          id: uuidv7(),
          kind: "Device Remove Error",
          state: "error",
          title: i18n.t("notification.removeTracksError"),
          detail: String(error),
        });
        return;
      }

      await refreshDevices();

      notification$.next({
        id: uuidv7(),
        kind: "Device Remove",
        state: "completed",
        title: i18n.t("notification.tracksRemoved"),
        detail: i18n.t("notification.tracksRemovedDetail", [
          trackIds.length,
          syncDevice.name,
        ]),
      });
    },
    [refreshDevices]
  );

  const addDevice = useCallback(
    async (
      usbDevice?: UsbDeviceInfo,
      rootDirectory?: FileSystemDirectoryHandle
    ) => {
      if (!usbDevice && !rootDirectory)
        throw new Error("The device cannot be synced");

      const device = await syncService.addDevice(rootDirectory, usbDevice);

      // Bump the revision so an in-flight refresh cannot overwrite this add,
      // and merge through the functional form so a stale `devices` closure
      // cannot drop a device added in the same tick.
      deviceListSync.current.markMutation();
      setDevices((current) => [
        ...current.filter((existing) => existing.id !== device.id),
        device,
      ]);

      return device;
    },
    [setDevices, syncService]
  );
  //#endregion

  //#region Effects
  useEffect(() => {
    const refresh = () => {
      void refreshDevices();
    };

    refresh();
  }, [refreshDevices]);

  useEffect(() => {
    if (!("usb" in navigator)) return;

    const handleConnect = () => {
      void refreshDevices();
    };

    const handleDisconnect = (event: USBConnectionEvent) => {
      // Clear the device's `connected` flag instead of dropping the row: the
      // device is still configured, it is just no longer plugged in, and the
      // row renders that as "offline".
      setDevices((current) =>
        markDeviceDisconnected(current, event.device.serialNumber)
      );
      deviceListSync.current.markMutation();
    };

    navigator.usb.addEventListener("connect", handleConnect);
    navigator.usb.addEventListener("disconnect", handleDisconnect);

    return () => {
      navigator.usb.removeEventListener("connect", handleConnect);
      navigator.usb.removeEventListener("disconnect", handleDisconnect);
    };
  }, [devices, refreshDevices]);
  //#endregion

  //#region Global event handlers
  useEffect(() => {
    // Same path as the context: filters out songs already on a device.
    const unregisterQueueSongs = commandDispatcher.register(
      "wmm.sync.queueSongs",
      async (payload?: { songIds?: string[] }) => {
        const songs = (
          await Promise.all(
            (payload?.songIds ?? []).map((id) => getStore().get(id))
          )
        ).filter((s): s is Song => !!s);
        if (songs.length) await queueSongs(songs);
      }
    );
    // queueSongs must be a dependency: it closes over `devices` and
    // `queuedSongs`, and re-registering is what keeps the filter current.

    const unregisterDequeueSongs = commandDispatcher.register(
      "wmm.sync.dequeueSongs",
      (payload?: { songIds?: string[] }) => {
        const idsToRemove = new Set(payload?.songIds ?? []);
        const next = queuedSongsRef.current.filter(
          (song) => !idsToRemove.has(song.id)
        );
        queuedSongsRef.current = next;
        setQueuedSongs(next);
        wmmBus.publish("wmm.sync.dequeued", {
          songIds: payload?.songIds ?? [],
        });
      }
    );

    const unregisterAddDevice = commandDispatcher.register(
      "wmm.sync.addDevice",
      async () => {
        try {
          const device = await addDevice();
          wmmBus.publish("wmm.sync.deviceAdded", { deviceId: device.id });
        } catch (error) {
          notification$.next({
            id: uuidv7(),
            kind: "Sync Device Error",
            state: "error",
            title: i18n.t("notification.addDeviceError"),
            detail: String(error),
          });
        }
      }
    );

    const unregisterSync = commandDispatcher.register(
      "wmm.sync.sync",
      (payload?: { deviceId: string }) => {
        const deviceId = payload?.deviceId ?? "";

        startDeviceSync(deviceId, {
          findDevice: (id) => devices.find((d) => d.id === id),
          syncQueue,
          onStarted: (device) => {
            wmmBus.publish("wmm.sync.syncCompleted", { deviceId: device.id });
          },
          onMissingDevice: (id) => {
            notification$.next({
              id: uuidv7(),
              kind: "Sync Device Error",
              state: "error",
              title: i18n.t("notification.deviceNotAvailable"),
              detail: i18n.t("notification.deviceNotAvailableDetail", [id]),
            });
          },
          onFailed: (_id, error) => {
            // The run never started, so clear the flag it may have raised and
            // say why instead of leaving an unhandled rejection.
            setIsSyncing(false);
            setSyncProgress(null);
            notification$.next({
              id: uuidv7(),
              kind: "Sync Device Error",
              state: "error",
              title: i18n.t("notification.syncStartError"),
              detail:
                error instanceof Error ? error.message : String(error),
            });
          },
        });
      }
    );

    const unregisterClearQueue = commandDispatcher.register(
      "wmm.sync.clearQueue",
      () => {
        clearQueue();
      }
    );

    const unregisterRemoveTracks = commandDispatcher.register(
      "wmm.sync.removeTracks",
      (payload?: { deviceId: string; trackIds: number[] }) => {
        const device = devices.find((d) => d.id === payload?.deviceId);
        if (!device) return;
        void removeTracksFromDevice(device, payload?.trackIds ?? []);
      }
    );

    return () => {
      unregisterQueueSongs();
      unregisterDequeueSongs();
      unregisterAddDevice();
      unregisterSync();
      unregisterClearQueue();
      unregisterRemoveTracks();
    };
  }, [queueSongs, addDevice, syncQueue, clearQueue, removeTracksFromDevice, devices]);
  //#endregion

  //#region Value
  const value = useMemo(
    () => ({
      addDevice,
      refreshDevices,
      devices,
      isSyncing,
      syncProgress,
      cancelSync,
      syncedSongIds,
      syncCompleted,
      queuedSongs,
      removeTracksFromDevice,
      registerSyncUi,
    }),
    [
      devices,
      queuedSongs,
      isSyncing,
      syncProgress,
      cancelSync,
      syncedSongIds,
      syncCompleted,
      refreshDevices,
      addDevice,
      removeTracksFromDevice,
      registerSyncUi,
    ]
  );
  //#endregion

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
