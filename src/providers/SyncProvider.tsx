import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Song, SyncDevice } from "@/models";
import { SyncContext } from "@/hooks";
import { commandDispatcher, wmmBus } from "@/core/events";
import { getStore } from "@/core/system";
import {
  SyncService,
  deviceTrackIdentities,
  isSongOnDevice,
  type UsbDeviceInfo,
} from "@/lib/sync";
import { notification$ } from "@/core/events/notification-events";
import { uuidv7 } from "uuidv7";

export function SyncProvider({ children }: { children: ReactNode }) {
  //#region State
  const [devices, setDevices] = useState<SyncDevice[]>([]);

  const [queuedSongs, setQueuedSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  //#endregion

  //#region Functions
  /**
   * Add songs to the queue, skipping anything already stored on a connected
   * device. The queue is device-agnostic, so a song counts as present when
   * any connected device has it. Returns the songs actually queued.
   */
  const queueSongs = useCallback(
    (songs: Song[]): Song[] => {
      const connectedIdentities = new Set<string>();

      for (const device of devices.filter((x) => x.connected)) {
        for (const identity of deviceTrackIdentities(device)) {
          connectedIdentities.add(identity);
        }
      }

      const alreadyQueued = new Set(queuedSongs.map((song) => song.id));

      const added = songs.filter(
        (song) =>
          !alreadyQueued.has(song.id) &&
          !isSongOnDevice(song, connectedIdentities)
      );

      if (added.length > 0) {
        setQueuedSongs((current) => [...current, ...added]);
        wmmBus.publish("wmm.sync.queued", {
          songIds: added.map((s) => s.id),
        });
      }

      const skipped = songs.length - added.length;

      if (skipped > 0) {
        notification$.next({
          id: uuidv7(),
          kind: "Queue Skipped",
          state: "completed",
          title: "Already on device",
          detail:
            `${skipped} song${skipped === 1 ? "" : "s"} skipped: already on `
            + "the connected device.",
        });
      }

      return added;
    },
    [devices, queuedSongs]
  );


  const clearQueue = useCallback(() => {
    setQueuedSongs([]);
  }, []);

  const syncService = useMemo(() => new SyncService(), []);

  const refreshDevices = useCallback(async () => {
    // loadPersistedDevices only returns devices matching a currently
    // connected USB device, so disconnected/absent ones are not shown.
    setDevices(await syncService.loadPersistedDevices());
  }, [syncService]);

  const syncQueue = useCallback(
    async (syncDevice: SyncDevice) => {
      // Guard against a stale closure: the button is disabled when the
      // queue is empty, but `queuedSongs` here is captured from the render
      // that created this callback. If it's empty despite the button
      // appearing enabled, bail with a clear error instead of syncing an
      // empty library (which would wipe the device).
      if (!queuedSongs.length) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title: "No songs to sync",
          detail:
            "The sync queue was empty when sync started. Please queue " +
            "at least one song and try again.",
        });
        return;
      }

      setIsSyncing(true);

      // Snapshot the queue for this run: `queuedSongs` is the value captured
      // when this callback was created, and the write needs a stable list.
      const songsToSync = [...queuedSongs];

      try {
        await syncService.syncSongs(syncDevice, songsToSync);
      } catch (error) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title: "Error syncing device",
          detail: String(error),
        });
        setIsSyncing(false);
        return;
      }

      // Success: the queue has been written to the device, so it is spent.
      // Clear it before the rescan so the queue and the device agree.
      clearQueue();

      // Rescan so the device card reflects the tracks and playlists just
      // written to the device instead of the snapshot taken when it was
      // first detected. The in-session directory handle still holds read
      // permission, so this does not prompt the user for a folder.
      // Awaited inside the try below so the spinner covers the rescan too.
      try {
        await refreshDevices();
      } catch (error) {
        notification$.next({
          id: uuidv7(),
          kind: "Device Refresh Error",
          state: "error",
          title: "Error refreshing device",
          detail: `Synced, but the device listing could not be refreshed: ${String(error)}`,
        });
      }

      setIsSyncing(false);
    },
    [syncService, queuedSongs, refreshDevices, clearQueue]
  );

  /**
   * Delete tracks from a device by their on-device ids, then rescan so the
   * card, the queue filter, and the nav badge all see the new library.
   */
  const removeTracksFromDevice = useCallback(
    async (syncDevice: SyncDevice, trackIds: number[]) => {
      if (trackIds.length === 0) return;

      try {
        await syncService.removeTracks(syncDevice, trackIds);
      } catch (error) {
        notification$.next({
          id: uuidv7(),
          kind: "Device Remove Error",
          state: "error",
          title: "Error removing tracks",
          detail: String(error),
        });
        return;
      }

      await refreshDevices();

      notification$.next({
        id: uuidv7(),
        kind: "Device Remove",
        state: "completed",
        title: "Tracks removed",
        detail: `Removed ${trackIds.length} track${
          trackIds.length === 1 ? "" : "s"
        } from ${syncDevice.name}.`,
      });
    },
    [syncService, refreshDevices]
  );

  const addDevice = useCallback(
    async (
      usbDevice?: UsbDeviceInfo,
      rootDirectory?: FileSystemDirectoryHandle
    ) => {
      if (!usbDevice && !rootDirectory)
        throw new Error("The device cannot be synced");

      const device = await syncService.addDevice(rootDirectory, usbDevice);

      setDevices([...devices, device]);

      return device;
    },
    [devices, setDevices, syncService]
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
    const handleConnect = () => {
      void refreshDevices();
    };

    const handleDisconnect = (event: USBConnectionEvent) => {
      const deviceMatches = (d: SyncDevice) => {
        if (!d.usb) return false;
        const match =
          String(d.usb.serialNumber) != String(event.device.serialNumber);
        return match;
      };
      setDevices(devices.filter(deviceMatches));
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
        if (songs.length) queueSongs(songs);
      }
    );
    // queueSongs must be a dependency: it closes over `devices` and
    // `queuedSongs`, and re-registering is what keeps the filter current.

    const unregisterDequeueSongs = commandDispatcher.register(
      "wmm.sync.dequeueSongs",
      (payload?: { songIds?: string[] }) => {
        const idsToRemove = new Set(payload?.songIds ?? []);
        setQueuedSongs((current) => {
          const next = current.filter((song) => !idsToRemove.has(song.id));
          wmmBus.publish("wmm.sync.dequeued", {
            songIds: payload?.songIds ?? [],
          });
          return next;
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
            title: "Error adding device",
            detail: String(error),
          });
        }
      }
    );

    const unregisterSync = commandDispatcher.register(
      "wmm.sync.sync",
      async (payload?: { deviceId: string }) => {
        const device = devices.find((d) => d.id === payload?.deviceId);
        if (!device) return;
        await syncQueue(device);
        wmmBus.publish("wmm.sync.syncCompleted", { deviceId: device.id });
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
      queuedSongs,
    }),
    [
      devices,
      queuedSongs,
      isSyncing,
      refreshDevices,
      addDevice,
    ]
  );
  //#endregion

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
