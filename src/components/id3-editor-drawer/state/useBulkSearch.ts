"use client";

import { useEffect, useRef, useState } from "react";
import type { Song } from "@/models";
import type { MusicResult } from "itunes-web-api";

export type BulkSongState = {
  id: string;
  title: string;
  artist: string;
  status: "idle" | "searching" | "done" | "error";
  matches: MusicResult[];
  selectedMatchId: number | null;
  previewMatchId: number | null;
};

export function useBulkSearch(
  songs: Song[],
  searchFn: (
    title: string,
    artist: string | undefined,
    album: string | undefined
  ) => Promise<MusicResult[]>
) {
  const [state, setState] = useState<BulkSongState[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    const initial = songs.map(s => ({
      id: s.id,
      title: s.tags?.title ?? "",
      artist: s.tags?.artist ?? "",
      status: "idle" as const,
      matches: [],
      selectedMatchId: null,
      previewMatchId: null
    }));

    setState(initial);
    abortRef.current = false;
  }, [songs]);

  async function start() {
    if (isRunning) return;
    setIsRunning(true);

    for (const song of songs) {
      if (abortRef.current) break;

      setState(prev =>
        prev.map(p =>
          p.id === song.id ? { ...p, status: "searching" } : p
        )
      );

      try {
        const results = await searchFn(
          song.tags?.title ?? "",
          song.tags?.artist,
          song.tags?.album
        );

        if (abortRef.current) break;

        setState(prev =>
          prev.map(p =>
            p.id === song.id
              ? {
                  ...p,
                  status: "done",
                  matches: results,
                  previewMatchId:
                    results.length === 1 ? results[0].trackId : null
                }
              : p
          )
        );
      } catch {
        if (abortRef.current) break;

        setState(prev =>
          prev.map(p =>
            p.id === song.id ? { ...p, status: "error" } : p
          )
        );
      }
    }

    setIsRunning(false);
  }

  function cancel() {
    abortRef.current = true;
    setIsRunning(false);
  }

  function previewMatch(songId: string, matchId: number | null) {
    setState(prev =>
      prev.map(p =>
        p.id === songId ? { ...p, previewMatchId: matchId } : p
      )
    );
  }

  function selectMatch(songId: string, matchId: number | null) {
    setState(prev =>
      prev.map(p =>
        p.id === songId
          ? {
              ...p,
              selectedMatchId: matchId,
              previewMatchId: matchId // sync preview to committed
            }
          : p
      )
    );
  }

  const progress = (() => {
    if (!state.length) return 0;
    const done = state.filter(s => s.status === "done").length;
    return done / state.length;
  })();

  return {
    state,
    isRunning,
    progress,
    start,
    cancel,
    previewMatch,
    selectMatch
  };
}