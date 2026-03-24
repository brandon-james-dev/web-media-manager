"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Song } from "@/models";
import type { BulkSongState } from "../state/useBulkSearch";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getStaticThumbnail } from "@/hooks/thumbnailQueryHooks";
import type { MusicResult } from "itunes-web-api";
import { Badge } from "@/components/ui/badge";

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
        const t = await getStaticThumbnail(song.id);
        if (cancelled) return;
        map.set(song.id, t.thumbLarge ?? null);
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

  function renderField(
    label: string,
    originalValue: any,
    entry: BulkSongState,
    matchKey: keyof MusicResult,
    transform?: (v: any) => any,
  ) {
    const match = entry.matches.find((m) => m.trackId === entry.previewMatchId);
    const newValueRaw = match ? match[matchKey] : null;
    const newValue = transform ? transform(newValueRaw) : newValueRaw;

    const isDirty =
      entry.previewMatchId !== null &&
      newValue !== null &&
      newValue !== originalValue;

    return (
      <div className="flex flex-col text-sm">
        <label className="text-muted-foreground">{label}</label>
        <span className={isDirty ? "text-blue-500" : ""}>
          {isDirty ? newValue : originalValue}
        </span>
      </div>
    );
  }

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
          onClick={onCancel}
          hidden={!isRunning}
          className="ml-4 px-4"
        >
          Cancel
        </Button>

        <Button
          disabled={!isIdle}
          onClick={onStart}
          hidden={isRunning}
          size="xs"
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

          const committedMatch = entry.matches.find(
            (m) => m.trackId === entry.selectedMatchId,
          );

          const previewedMatch = entry.matches.find(
            (m) => m.trackId === entry.previewMatchId,
          );

          const isOpen = openMatches.has(entry.id);

          const activeMatch = isOpen ? previewedMatch : committedMatch;

          const activeArt = activeMatch
            ? (activeMatch.artworkUrl100?.replace("100x100bb", "300x300bb") ??
              "")
            : (idToAlbumArt.get(song.id) ?? "");
          const committedArt = committedMatch
            ? (committedMatch.artworkUrl100?.replace(
                "100x100bb",
                "300x300bb",
              ) ?? "")
            : (idToAlbumArt.get(song.id) ?? "");

          const isDirty = entry.selectedMatchId !== null;

          return (
            <details
              key={entry.id}
              open={isOpen}
              onToggle={(evt) => {
                const el = evt.currentTarget as HTMLDetailsElement;
                const next = new Set(openMatches);
                if (el.open) next.add(entry.id);
                else next.delete(entry.id);
                setOpenMatches(next);
              }}
              onClick={(evt) => {
                if (entry.matches.length == 0) {
                  evt.preventDefault();
                  return;
                }
              }}
              className="border rounded bg-background"
            >
              <summary
                className={`${
                  entry.matches.length == 0
                    ? "cursor-default pointer-events-none"
                    : "cursor-pointer hover:bg-accent"
                } p-3 flex items-center justify-between`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={committedArt}
                    alt={song.album}
                    className="w-12 h-12 object-cover rounded bg-muted"
                  />

                  <div className="flex flex-col">
                    <span className="font-medium">
                      {committedMatch
                        ? committedMatch.trackName
                        : song.tags?.title}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {committedMatch
                        ? committedMatch.artistName
                        : song.tags?.artist}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {committedMatch
                        ? committedMatch.collectionName
                        : song.tags?.album}
                    </span>

                    {entry.status === "searching" && (
                      <span className="text-xs text-blue-600 mt-1">
                        Searching…
                      </span>
                    )}

                    {isDirty && entry.status !== "searching" && (
                      <span className="text-xs text-blue-600 mt-1">
                        Match selected
                      </span>
                    )}

                    {!isDirty && entry.status !== "searching" && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {entry.matches.length == 0
                          ? "No"
                          : entry.matches.length}{" "}
                        {entry.matches.length == 1 ? "match" : "matches"}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="flex justify-end gap-2 text-sm text-muted-foreground"
                  hidden={entry.status !== "done"}
                >
                  {useMemo(() => (
                    <span hidden={entry.matches.length == 0}>
                      {!isOpen && <ChevronDown />}
                      {isOpen && <ChevronUp />}
                    </span>
                  ), [isOpen])}
                </div>
              </summary>

              <div className="border-t p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:sticky md:top-0 self-start">
                    <div className="flex flex-col gap-3">
                      <img
                        src={activeArt}
                        alt="Album Art"
                        className="w-32 h-32 object-cover rounded bg-muted"
                      />

                      {renderField(
                        "Title",
                        song.tags?.title,
                        entry,
                        "trackName",
                      )}
                      {renderField(
                        "Artist",
                        song.tags?.artist,
                        entry,
                        "artistName",
                      )}
                      {renderField(
                        "Album",
                        song.tags?.album,
                        entry,
                        "collectionName",
                      )}
                      {renderField(
                        "Year",
                        song.tags?.year,
                        entry,
                        "releaseDate",
                        (v) => (v ? new Date(v).getFullYear() : ""),
                      )}
                      {renderField(
                        "Genre",
                        song.tags?.genre,
                        entry,
                        "primaryGenreName",
                      )}

                      <div className="flex gap-2 justify-stretch">
                        <Button
                          type="button"
                          variant="default"
                          size="xs"
                          className="flex-2 mt-2"
                          disabled={!entry.previewMatchId}
                          onClick={() => {
                            if (entry.previewMatchId !== null) {
                              selectMatch(entry.id, entry.previewMatchId);
                            }
                            const next = new Set(openMatches);
                            next.delete(entry.id);
                            setOpenMatches(next);
                          }}
                        >
                          Confirm Selection
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          className="flex-1 mt-2"
                          disabled={
                            !entry.previewMatchId && !entry.selectedMatchId
                          }
                          onClick={() => {
                            previewMatch(entry.id, null);
                            selectMatch(entry.id, null);
                          }}
                        >
                          Clear Selection
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-h-114 overflow-y-auto pr-2">
                    {entry.status === "searching" && (
                      <div className="text-sm text-muted-foreground">
                        Searching for matches…
                      </div>
                    )}

                    {entry.status !== "searching" &&
                      entry.matches.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No matches found
                        </div>
                      )}

                    {entry.status !== "searching" &&
                      entry.matches.map((m) => (
                        <button
                          key={m.trackId}
                          type="button"
                          onClick={() => previewMatch(entry.id, m.trackId)}
                          className={`w-full text-left border rounded p-2 hover:bg-muted transition ${
                            entry.previewMatchId === m.trackId
                              ? "border-blue-500 bg-blue-500/50"
                              : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                m.artworkUrl100
                                  ? m.artworkUrl100.replace(
                                      "100x100bb",
                                      "60x60bb",
                                    )
                                  : ""
                              }
                              alt=""
                              className="w-12 h-12 object-cover rounded bg-muted"
                            />

                            <div>
                              <div className="font-medium">{m.trackName}</div>
                              <div
                                className={`text-sm ${
                                  entry.previewMatchId === m.trackId
                                    ? "text-blue-400"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {m.artistName} — {m.collectionName}
                                {m.trackExplicitness !== "notExplicit" && (
                                  <Badge className="ml-1 size-4">E</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
