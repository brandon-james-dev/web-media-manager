import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Song, SyncDevice } from "@/models";
import { SyncContext } from "@/hooks";
import { queueSongs$, dequeueSongs$ } from "@/events";
import { SyncService, type UsbDeviceInfo } from "@/lib/sync";
import { notification$ } from "@/events/notification-events";
import { uuidv7 } from "uuidv7";

export function SyncProvider({ children }: { children: ReactNode }) {
  //#region State
  const [devices, setDevices] = useState<SyncDevice[]>([]);

  const [queuedSongs, setQueuedSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  //#endregion

  //#region Functions
  const queueSongs = (songs: Song[]) => {
    setQueuedSongs((current) => {
      const existing = new Set(current.map((song) => song.id));

      return [...current, ...songs.filter((song) => !existing.has(song.id))];
    });
  };

  const removeQueuedSong = (songId: string) => {
    setQueuedSongs((current) => current.filter((song) => song.id !== songId));
  };

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
          detail: "The sync queue was empty when sync started. Please queue "
            + "at least one song and try again.",
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

  const removeDevice = useCallback(
    (id: string) => {
      setDevices(devices.filter((device) => device.id !== id));
    },
    [devices, setDevices]
  );

  const updateDevice = useCallback(
    (updatedDevice: SyncDevice) => {
      setDevices(
        devices.map((device) =>
          device.id === updatedDevice.id ? updatedDevice : device
        )
      );
    },
    [devices, setDevices]
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
    const queueSub = queueSongs$.subscribe((songs) => {
      setQueuedSongs((current) => {
        const existingIds = new Set(current.map((x) => x.id));

        const additions = songs.filter((song) => !existingIds.has(song.id));

        return [...current, ...additions];
      });
    });

    const dequeueSub = dequeueSongs$.subscribe((songs) => {
      const idsToRemove = new Set(songs.map((song) => song.id));

      setQueuedSongs((current) =>
        current.filter((song) => !idsToRemove.has(song.id))
      );
    });

    return () => {
      queueSub.unsubscribe();
      dequeueSub.unsubscribe();
    };
  }, []);
  //#endregion

  //#region Value
  const value = useMemo(
    () => ({
      addDevice,
      removeDevice,
      updateDevice,
      devices,
      setDevices,

      refreshDevices,
      isSyncing,
      syncQueue,

      queuedSongs,
      queueSongs,
      removeQueuedSong,
      clearQueue,
    }),
    [
      devices,
      queuedSongs,
      isSyncing,
      refreshDevices,
      syncQueue,
      addDevice,
      removeDevice,
      updateDevice,
      clearQueue,
    ]
  );
  //#endregion

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
