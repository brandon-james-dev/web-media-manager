import React, { useEffect, useRef, useState } from "react";
import { getMetadataStore } from "@/lib/file-utils";
import { backgroundService } from "@/lib/background-jobs";
import type { Song } from "@/models/Song";
import { SongContext } from "./useSongs";
import { readSongFile } from "@/lib";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";
import { isValidAudioFile } from "taglib-wasm";
import useFileSystemAccess from "use-fs-access";
import type { FileOrDirectoryInfo } from "use-fs-access/core";
import { getPersistedRootDirectory } from "@/lib/dexie-utils";

export function SongProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const lastProgressTime = useRef<number>(Date.now());
  const refreshTimeout = useRef<number | null>(null);

  //#region Directory Watcher
  const persistedRootDirectory = useRef<FileSystemDirectoryHandle | null>(null);
  const hasRestoredDirectory = useRef(false);

  const addedDebounce = new Map<string, number>();
  const deletedDebounce = new Map<string, number>();
  const modifiedDebounce = new Map<string, number>();

  function shouldProcess(
    map: Map<string, number>,
    key: string,
    windowMs = 300
  ) {
    const now = Date.now();
    const last = map.get(key);

    if (last && now - last < windowMs) {
      return false; // duplicate
    }

    map.set(key, now);
    return true;
  }

  async function handleAdded(entries: Map<string, FileOrDirectoryInfo>) {
    const store = getMetadataStore();

    for (const [name, info] of entries) {
      if (!shouldProcess(addedDebounce, name)) continue;

      if (info.handle.kind != "file") return;

      const handle = info.handle as FileSystemFileHandle;

      if (!(await isValidAudioFile(await handle.getFile()))) return;

      const processedSong = await readSongFile(
        handle,
        new TagLibMetadataReader()
      );

      if (!processedSong) return;

      await store.save(name, processedSong);
    }
  }

  async function handleDeleted(entries: Map<string, FileOrDirectoryInfo>) {
    const store = getMetadataStore();
    for (const [name] of entries) {
      if (!shouldProcess(deletedDebounce, name)) continue;

      await store.delete(name);
    }
  }

  function handleModified(entries: Map<string, FileOrDirectoryInfo>) {
    for (const [name, info] of entries) {
      if (!shouldProcess(modifiedDebounce, name)) continue;

      // Process modified file
      console.log("Modified:", name, info);
    }
  }

  const scheduleRefresh = () => {
    const now = Date.now();
    const delta = now - lastProgressTime.current;
    lastProgressTime.current = now;

    const delay = Math.min(500, Math.max(50, delta * 1.5));

    if (refreshTimeout.current !== null) {
      clearTimeout(refreshTimeout.current);
    }

    refreshTimeout.current = window.setTimeout(() => {
      refreshSongs();
    }, delay);
  };

  const { openDirectory } = useFileSystemAccess({
    enableFileWatcher: true,
    fileWatcherOptions: {
      debug: false,
      pollInterval: 250,
    },
    onFilesAdded: handleAdded,
    onFilesDeleted: handleDeleted,
    onFilesModified: handleModified,
  });

  // Set up directory event watchers
  useEffect(() => {
    (async () => {
      const rootDirectory = await getPersistedRootDirectory();
      if (rootDirectory) {
        persistedRootDirectory.current = rootDirectory.directoryHandle;
      }
    })();

    if (!persistedRootDirectory.current) return;

    if (!hasRestoredDirectory.current) {
      hasRestoredDirectory.current = true;
      openDirectory(persistedRootDirectory.current);
    }
  }, [openDirectory, hasRestoredDirectory, persistedRootDirectory]);

  const setRootDirectory = (directoryHandle: FileSystemDirectoryHandle) => {
    openDirectory(directoryHandle);
  };

  //#endregion

  const refreshSongs = async () => {
    const store = getMetadataStore();
    const all = await store.getAll();
    setSongs(all);
  };

  useEffect(() => {
    refreshSongs();
  }, []);

  useEffect(() => {
    const store = getMetadataStore();
    const unsubAdd = store.onAdded((song) => {
      setSongs((prev) => [...prev, song]);

      scheduleRefresh();
    });

    const unsubUpdate = store.onUpdated((song) => {
      setSongs((prev) => prev.map((s) => (s.id === song.id ? song : s)));

      scheduleRefresh();
    });

    const unsubDelete = store.onDeleted((song) => {
      setSongs((prev) => prev.filter((s) => s.id != song.id));

      scheduleRefresh();
    });

    const unsubStoreCleared = store.onStoreCleared(() => {
      setSongs(() => []);

      scheduleRefresh();
    });

    return () => {
      unsubAdd();
      unsubUpdate();
      unsubDelete();
      unsubStoreCleared();
    };
  }, []);

  useEffect(() => {
    const store = getMetadataStore();
    return backgroundService.onJobProgress(async (event) => {
      if (event.jobType === "bulkImport") {
        const newSong = event.payload.data;

        if (newSong) {
          await store.save(newSong.id, newSong);
          scheduleRefresh();
        }
      }

      if (event.jobType === "bulkEdit") {
        const updated = event.payload.data;
        const existing = await store.get(updated.id);
        const merged = { ...existing, ...updated };
        await store.save(merged.id, merged);

        scheduleRefresh();
      }
    });
  }, []);

  return (
    <SongContext.Provider value={{ songs, refreshSongs, setRootDirectory }}>
      {children}
    </SongContext.Provider>
  );
}
