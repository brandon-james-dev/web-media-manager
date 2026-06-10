/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import type { MusicResult } from "itunes-web-api";
import { ChevronDown, ChevronUp, Music, Badge } from "lucide-react";
import { useMemo } from "react";
import type { BulkSongState } from "../state/useBulkSearch";
import type { Song } from "@/models";

type BulkMatchItemProps = {
  entry: BulkSongState;
  song: Song;
  isOpen: boolean;
  activeArt: string | null | undefined;
  committedArt: string | null | undefined;
  committedMatch: MusicResult | undefined;
  previewMatch: (songId: string, matchId: number | null) => void;
  selectMatch: (songId: string, matchId: number | null) => void;
  onDetailsToggle: (e: React.ToggleEvent) => void;
  onConfirm: () => void;
};

export function BulkMatchItem(props: BulkMatchItemProps) {
  const {
    entry,
    song,
    isOpen,
    activeArt,
    committedArt,
    committedMatch,
    previewMatch,
    selectMatch,
    onDetailsToggle,
    onConfirm
  } = props;

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

  const isDirty = entry.selectedMatchId !== null;

  const isOpenToggler = useMemo(
    () => (
      <div
        className="flex justify-end gap-2 text-sm text-muted-foreground"
        hidden={entry.status !== "done"}
      >
        <span hidden={entry.matches.length == 0}>
          {!isOpen && <ChevronDown />}
          {isOpen && <ChevronUp />}
        </span>
      </div>
    ),
    [isOpen, entry],
  );

  return (
    <details
      key={entry.id}
      open={isOpen}
      onToggle={onDetailsToggle}
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
          {committedArt && (
            <img
              src={committedArt}
              alt={song.tags?.album}
              className="w-12 h-12 object-cover rounded bg-muted"
            />
          )}
          {!committedArt && (
            <div className="w-12 h-12 object-cover rounded bg-muted flex items-center justify-center">
              <Music />
            </div>
          )}

          <div className="flex flex-col">
            <span className="font-medium">
              {committedMatch ? committedMatch.trackName : song.tags?.title}
            </span>
            <span className="text-sm text-muted-foreground">
              {committedMatch ? committedMatch.artistName : song.tags?.artist}
            </span>
            <span className="text-xs text-muted-foreground">
              {committedMatch
                ? committedMatch.collectionName
                : song.tags?.album}
            </span>

            {entry.status === "searching" && (
              <span className="text-xs text-blue-600 mt-1">Searching…</span>
            )}

            {isDirty && entry.status !== "searching" && (
              <span className="text-xs text-blue-600 mt-1">Match selected</span>
            )}

            {!isDirty && entry.status !== "searching" && (
              <span className="text-xs text-muted-foreground mt-1">
                {entry.matches.length == 0 ? "No" : entry.matches.length}{" "}
                {entry.matches.length == 1 ? "match" : "matches"}
              </span>
            )}
          </div>
        </div>
        {isOpenToggler}
      </summary>

      <div className="border-t p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:sticky md:top-0 self-start">
            <div className="flex flex-col gap-3">
              {activeArt && (
                <img
                  src={activeArt}
                  alt={song.tags?.album}
                  className="w-32 h-32 object-cover rounded bg-muted"
                />
              )}
              {!activeArt && (
                <div className="w-32 h-32 object-cover rounded bg-muted flex items-center justify-center">
                  <Music />
                </div>
              )}

              {renderField("Title", song.tags?.title, entry, "trackName")}
              {renderField("Artist", song.tags?.artist, entry, "artistName")}
              {renderField("Album", song.tags?.album, entry, "collectionName")}
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
                  onClick={onConfirm}
                >
                  Confirm Selection
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="flex-1 mt-2"
                  disabled={!entry.previewMatchId && !entry.selectedMatchId}
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

            {entry.status !== "searching" && entry.matches.length === 0 && (
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
                          ? m.artworkUrl100.replace("100x100bb", "60x60bb")
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
}
