import React, { useEffect, useRef, useState } from "react";
import { getMetadataStore } from "@/lib/file-utils";
import { backgroundService } from "@/lib/background-jobs";
import type { Song } from "@/models/Song";
import { SongContext } from "./useSongs";

export function SongProvider({ children }: { children: React.ReactNode }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const lastProgressTime = useRef<number>(Date.now());
  const refreshTimeout = useRef<number | null>(null);

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

  const refreshSongs = async () => {
    const store = getMetadataStore();
    const all = await store.getAllSongs();
    setSongs(all);
  };

  useEffect(() => {
    refreshSongs();
  }, []);

  useEffect(() => {
    const store = getMetadataStore();
    const unsubAdd = store.onSongAdded((song) => {
      setSongs((prev) => [...prev, song]);

      scheduleRefresh();
    });

    const unsubUpdate = store.onSongUpdated((song) => {
      setSongs((prev) => prev.map((s) => (s.id === song.id ? song : s)));

      scheduleRefresh();
    });

    const unsubDelete = store.onSongDeleted((song) => {
      setSongs((prev) => prev.filter((s) => s.id != song.id));

      scheduleRefresh();
    });

    return () => {
      unsubAdd();
      unsubUpdate();
      unsubDelete();
    };
  }, []);

  useEffect(() => {
    const store = getMetadataStore();
    return backgroundService.onJobProgress(async (event) => {
      if (event.jobType === "bulkImport") {
        const newSong = event.payload.data;
        await store.saveSong(newSong.id, newSong);

        scheduleRefresh();
      }

      if (event.jobType === "bulkEdit") {
        const updated = event.payload.data;
        const existing = await store.getSong(updated.id);
        const merged = { ...existing, ...updated };
        await store.saveSong(merged.id, merged);

        scheduleRefresh();
      }
    });
  }, []);

  return (
    <SongContext.Provider value={{ songs, refreshSongs }}>
      {children}
    </SongContext.Provider>
  );
}
