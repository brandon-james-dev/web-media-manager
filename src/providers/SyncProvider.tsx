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

  const clearQueue = () => {
    setQueuedSongs([]);
  };

  const syncService = useMemo(() => new SyncService(), []);

  const refreshDevices = useCallback(async () => {
    if ((await navigator.usb.getDevices()).length > 0) {
      const syncService = new SyncService();

      const devices = await syncService.loadPersistedDevices();

      setDevices(devices);
    }
  }, [syncService]);

  const syncQueue = useCallback(
    async (syncDevice: SyncDevice) => {
      setIsSyncing(true);

      try {
        await syncService.syncSongs(syncDevice, queuedSongs);
      } catch (error) {
        notification$.next({
          id: uuidv7(),
          kind: "Sync Device Error",
          state: "error",
          title: "Error syncing device",
          detail: String(error),
        });
      } finally {
        setIsSyncing(false);
      }
    },
    [syncService, queuedSongs]
  );

  const addDevice = useCallback(
    async (
      usbDevice?: UsbDeviceInfo,
      rootDirectory?: FileSystemDirectoryHandle
    ) => {
      if (!usbDevice && !rootDirectory)
        throw new Error("The device cannot be synced");

      const device = await syncService.addDevice(usbDevice, rootDirectory);

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
    ]
  );
  //#endregion

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
