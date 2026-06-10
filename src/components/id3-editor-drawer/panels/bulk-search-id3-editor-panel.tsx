"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Song } from "@/models";
import type { BulkSongState } from "../state/useBulkSearch";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import { BulkMatchItem } from "./bulk-match-item";

type BulkSearchId3EditorPanelProps = {
  songs: Song[];
  bulkState: BulkSongState[];
  progress: number;
  isRunning: boolean;
  onStart: () => void;
  onCancel: () => void;
  previewMatch: (songId: string, matchId: number | null) => void;
  selectMatch: (songId: string, matchId: number | null) => void;
};

export function BulkSearchId3EditorPanel(props: BulkSearchId3EditorPanelProps) {
  const {
    songs,
    bulkState,
    progress,
    isRunning,
    onStart,
    onCancel,
    previewMatch,
    selectMatch,
  } = props;

  const [idToAlbumArt, setIdToAlbumArt] = useState<Map<string, string | null>>(
    new Map(),
  );

  const [openMatches, setOpenMatches] = useState<Set<string>>(
    new Set<string>(),
  );

  const isIdle = bulkState.every((s) => s.status === "idle");
  const hasCompletedSearch = bulkState.every(
    (s) => s.status === "done" || s.status === "error",
  );

  const matchButtonText = hasCompletedSearch
    ? "Matching Complete"
    : "Start Matching";

  useEffect(() => {
    let cancelled = false;

    async function loadArt() {
      const map = new Map<string, string | null>();

      for (const song of songs) {
        const { thumbnail } = await getStaticThumbnail(song.id, "lg");
        if (cancelled) return;
        if (thumbnail) map.set(song.id, thumbnail);
      }

      if (!cancelled) {
        setIdToAlbumArt(map);
      }
    }

    loadArt();

    return () => {
      cancelled = true;
    };
  }, [songs]);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Progress value={progress * 100} hidden={hasCompletedSearch} />
          <span
            className="text-muted-foreground text-xs"
            hidden={!hasCompletedSearch}
          >
            {bulkState.length} songs matched
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={onCancel}
          hidden={!isRunning}
          className="ml-4 px-4"
        >
          Cancel
        </Button>

        <Button
          type="button"
          size="xs"
          disabled={!isIdle}
          onClick={onStart}
          hidden={isRunning}
          variant={hasCompletedSearch ? "ghost" : "default"}
          className="ml-4 px-4"
        >
          {matchButtonText}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {bulkState.map((entry) => {
          const song = songs.find((s) => s.id === entry.id);
          if (!song) return null;
          const isOpen = openMatches.has(entry.id);

          const committedMatch = entry.matches.find(
            (m) => m.trackId === entry.selectedMatchId,
          );

          const previewedMatch = entry.matches.find(
            (m) => m.trackId === entry.previewMatchId,
          );

          const activeMatch = isOpen ? previewedMatch : committedMatch;
          const activeArt = activeMatch
            ? (activeMatch.artworkUrl100?.replace("100x100bb", "300x300bb") ??
              "")
            : idToAlbumArt.get(song.id);
          const committedArt = committedMatch
            ? committedMatch.artworkUrl100?.replace("100x100bb", "300x300bb")
            : idToAlbumArt.get(song.id);

          const onDetailsToggle = (evt: React.ToggleEvent) => {
            const el = evt.currentTarget as HTMLDetailsElement;
            const next = new Set(openMatches);
            if (el.open) next.add(entry.id);
            else next.delete(entry.id);
            setOpenMatches(next);
          };

          const onConfirm = () => {
            if (entry.previewMatchId !== null) {
              selectMatch(entry.id, entry.previewMatchId);
            }
            const next = new Set(openMatches);
            next.delete(entry.id);
            setOpenMatches(next);
          };

          return (
            <BulkMatchItem
              entry={entry}
              song={song}
              isOpen={isOpen}
              activeArt={activeArt}
              committedArt={committedArt}
              committedMatch={committedMatch}
              previewMatch={previewMatch}
              selectMatch={selectMatch}
              onConfirm={onConfirm}
              onDetailsToggle={onDetailsToggle}
            />
          );
        })}
      </div>
    </div>
  );
}
