import React, { useEffect, useRef, useState } from "react";
import { isValidAudioFile } from "taglib-wasm";
import useFileSystemAccess from "use-fs-access";
import type { FileOrDirectoryInfo } from "use-fs-access/core";
import { readSongFile } from "@/lib";
import { getMetadataStore } from "@/lib/file-utils";
import { backgroundService } from "@/lib/background-jobs";
import { TagLibMetadataReader } from "@/lib/taglib-metadata-utils";
import { getPersistedRootDirectories } from "@/lib/dexie-utils";
import type { QueryOptions } from "@/lib/store";
import type { Directory, Song } from "@/models";
import { SongContext } from "@/hooks";

export function SongProvider({ children }: { children: React.ReactNode }) {
  //#region State
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [filtered, setFiltered] = useState<number>(0);
  const [page, setPage] = useState<number | undefined>();
  const [skip, setSkip] = useState<number | undefined>();
  const [query, setQuery] = useState<QueryOptions<Song>>({
    sort: { selector: (song: Song) => song.title, desc: false },
  });
  const lastProgressTime = useRef<number>(Date.now());
  const refreshTimeout = useRef<number | null>(null);
  //#endregion

  //#region Directory Watcher
  const persistedRootDirectories = useRef<Directory[]>([]);
  const hasRestoredDirectories = useRef(false);

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
    for (const [name] of entries) {
      if (!shouldProcess(modifiedDebounce, name)) continue;

      scheduleRefresh();
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
      const directories = await getPersistedRootDirectories();
      if (directories) {
        persistedRootDirectories.current = directories;
      }
    })();

    if (!persistedRootDirectories.current) return;

    if (
      !hasRestoredDirectories.current &&
      persistedRootDirectories.current.length > 0
    ) {
      hasRestoredDirectories.current = true;

      for (const { directoryHandle } of persistedRootDirectories.current) {
        openDirectory(directoryHandle);
      }
    }
  }, [openDirectory, hasRestoredDirectories, persistedRootDirectories]);

  //#endregion

  //#region Helpers
  const refreshSongs = async () => {
    const store = getMetadataStore();
    const result = await store.filter(query);

    setSongs(result.data);
    setTotal(result.total);
    setFiltered(result.filteredCount);
    setPage(result.page);
    setSkip(result.skip);
  };

  // Initializer
  useEffect(() => {
    refreshSongs();
  }, [query]);

  //#endregion

  //#region Global event listeners
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
  //#endregion

  return (
    <SongContext.Provider
      value={{
        songs,
        query,
        total,
        skip,
        page,
        filtered,
        refreshSongs,
        setQuery,
      }}
    >
      {children}
    </SongContext.Provider>
  );
}
