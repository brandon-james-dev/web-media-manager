import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileMusic,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Textarea } from "../ui/textarea";
import { useTranslation } from "@/i18n";
import {
  activePlacementAt,
  appendStaticLine,
  canPlaceAt,
  formatTimecode,
  isInsideWindow,
  mapPlacementsToLines,
  parseLrc,
  parseTimecode,
  placementWindow,
  serializeLrc,
  staticLines,
  syncPlacementsToLyrics,
  validateSync,
} from "@/lib/lyrics";
import type { ILyricLine } from "@/lib/lyrics";
import { computeWaveformPeaks } from "@/lib/waveform";
import { resolveSongBytesWithCache, resolveThroughSource } from "@/lib/offline";
import { WaveformScrubber } from "../waveform-scrubber/WaveformScrubber";
import { SyncedLyricsView } from "@/components/lyrics-view";
import type { SyncedLyricsEditorDialogProps } from "./SyncedLyricsEditorDialogProps";

/**
 * Stable identity for a placement. Times are unique within the list, so time
 * plus text distinguishes two placements that happen to share lyric text.
 */
function placementKey(line: ILyricLine): string {
  return `${line.timeMs}:${line.text}`;
}

export function SyncedLyricsEditorDialog(props: SyncedLyricsEditorDialogProps) {
  const { song, lyrics, syncedLyrics, open, onOpenChange, onSave, embedded } = props;
  const { t } = useTranslation();

  //#region State
  // Seeded from the song being edited. The parent keys this component by song
  // and open state, so a remount is what resets the form: no effect has to
  // write the props back into state on open.
  const [staticText, setStaticText] = useState(() =>
    lyrics && lyrics.trim() !== "" ? lyrics : (song.lyrics ?? "")
  );
  const [lines, setLines] = useState<ILyricLine[]>(() =>
    parseLrc(syncedLyrics ?? song.syncedLyrics)
  );
  const [cursorMs, setCursorMs] = useState(0);
  const [durationMs, setDurationMs] = useState(
    () => song.durationMs ?? (song.duration ?? 0) * 1000
  );
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | undefined>();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(open);
  const [draftText, setDraftText] = useState("");
  const [addedTexts, setAddedTexts] = useState<Set<string>>(new Set());
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [selectedPlacementKeys, setSelectedPlacementKeys] = useState<string[]>(
    []
  );
  const [shiftMs, setShiftMs] = useState(0);
  const [editingLyrics, setEditingLyrics] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent keys this component by song and open state, so a remount resets
  // the form. Loading a result into the timed tab does not remount it, though:
  // the dialog stays open and only the props change. Without this, the editor
  // keeps the lines it parsed on mount and shows "no timed lines" for lyrics
  // that were just loaded. Only an incoming value that differs from the current
  // lines replaces them, so the editor's own save does not reset the form.
  const lastIncomingRef = useRef(syncedLyrics ?? song.syncedLyrics ?? "");
  useEffect(() => {
    const incoming = syncedLyrics ?? song.syncedLyrics ?? "";
    if (incoming === lastIncomingRef.current) return;
    lastIncomingRef.current = incoming;
    setLines((current) =>
      serializeLrc(current) === incoming ? current : parseLrc(incoming)
    );
    setStaticText(lyrics && lyrics.trim() !== "" ? lyrics : (song.lyrics ?? ""));
    setSelectedIndices([]);
    setSelectedPlacementKeys([]);
    setAddedTexts(new Set());
  }, [syncedLyrics, song.syncedLyrics, lyrics, song.lyrics]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const staticRef = useRef<HTMLDivElement>(null);
  const placementListRef = useRef<HTMLDivElement>(null);
  // A ref, not state: a shift-click can land in the same tick as the click
  // that set the anchor, before a re-render would have committed it.
  const placementAnchorRef = useRef<string | null>(null);
  const staticAnchorRef = useRef<number | null>(null);
  //#endregion

  const issues = useMemo(
    () => validateSync(staticText, lines),
    [staticText, lines]
  );

  const sourceLines = useMemo(() => staticLines(staticText), [staticText]);

  // Each static line's own placement, so a repeated lyric keeps its own timing.
  const timedByIndex = useMemo(
    () => mapPlacementsToLines(staticText, lines),
    [staticText, lines]
  );

  /**
   * The placement being sung right now: the last one at or before the cursor.
   * Only while playing, so a paused editor keeps whatever the user selected.
   */
  const activePlacementKey = useMemo(() => {
    if (!playing || lines.length === 0) return null;
    const active = activePlacementAt(lines, cursorMs);
    return active ? placementKey(active) : null;
  }, [playing, lines, cursorMs]);

  /** The static lyric line that placement belongs to, or -1 when none. */
  const activeLineIndex = useMemo(() => {
    if (!playing) return -1;
    let index = -1;
    let time = -1;
    timedByIndex.forEach((timed, lineIndex) => {
      if (timed && timed.timeMs <= cursorMs && timed.timeMs > time) {
        time = timed.timeMs;
        index = lineIndex;
      }
    });
    return index;
  }, [playing, timedByIndex, cursorMs]);

  /** Brings the matching placement into view when a lyric line is clicked. */
  const scrollToPlacement = useCallback((timeMs: number) => {
    placementListRef.current
      ?.querySelector(`[data-placement-time="${timeMs}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, []);

  /** Brings the matching lyric line into view when a placement is clicked. */
  const scrollToLine = useCallback((index: number) => {
    staticRef.current
      ?.querySelector(`[data-line-index="${index}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, []);

  // Latest placement first, so the newest timing reads at the top of the list.
  const sortedLines = useMemo(
    () => [...lines].sort((a, b) => b.timeMs - a.timeMs),
    [lines]
  );

  /** The lines the draft box would place, in the order they would be added. */
  const draftTexts = useMemo(
    () =>
      draftText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== ""),
    [draftText]
  );

  /**
   * The window the draft may be timed in. An untimed lyric is bounded by the
   * placements around it; a line that is not in the lyrics is unbounded.
   */
  const draftWindow = useMemo(
    () => placementWindow(staticText, lines, draftTexts),
    [staticText, lines, draftTexts]
  );

  /** Whether the cursor currently sits somewhere the draft may be placed. */
  const canAddDraft = useMemo(
    () =>
      draftTexts.length > 0 &&
      isInsideWindow(cursorMs, draftWindow) &&
      canPlaceAt(cursorMs, lines),
    [draftTexts, cursorMs, draftWindow, lines]
  );

  //#region Effects
  // Decode the audio once per open so the waveform and playback share it.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let objectUrl: string | undefined;

    void (async () => {
      try {
        const bytes = await resolveSongBytesWithCache(song, resolveThroughSource);
        if (cancelled || !bytes) return;

        const envelope = await computeWaveformPeaks(bytes);
        if (cancelled) return;

        objectUrl = URL.createObjectURL(new Blob([bytes]));
        setPeaks(envelope);
        setAudioUrl(objectUrl);
      } catch {
        if (!cancelled) setError(t("metadata.syncedLyricsLoadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, song, t]);

  /**
   * Picks a static lyric line for the timing side. Shift-click extends the
   * range from the last clicked line, so adjacent lines can be placed together.
   */
  function handleStaticLineClick(index: number, extend: boolean) {
    const text = sourceLines[index];
    if (!text) return;

    const timed = timedByIndex[index];
    if (timed) scrollToPlacement(timed.timeMs);

    // The anchor is an index, not the text: a repeated line would otherwise
    // extend the range from its first occurrence.
    const from = staticAnchorRef.current;

    if (extend && from !== null) {
      const [start, end] = from <= index ? [from, index] : [index, from];
      const range = sourceLines.slice(start, end + 1);
      const indices = range.map((_, offset) => start + offset);

      setSelectedIndices(indices);
      setDraftText(range.join("\n"));
      return;
    }

    staticAnchorRef.current = index;
    setSelectedIndices([index]);
    setDraftText(text);
  }
  //#endregion

  //#region Interactivity handlers
  const seek = useCallback((timeMs: number) => {
    setCursorMs(timeMs);

    const audio = audioRef.current;
    if (audio) audio.currentTime = timeMs / 1000;
  }, []);

  function handleScrub(timeMs: number) {
    seek(timeMs);
  }

  async function handleTogglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play().catch(() => setError(t("metadata.syncedLyricsLoadFailed")));
    } else {
      audio.pause();
    }
  }

  /** Places the draft text at the cursor and mirrors it into the lyrics. */
  function handleAddLine() {
    const texts = draftText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== "");

    if (texts.length === 0) return;

    // An untimed lyric keeps its place in the lyrics, so its timing belongs
    // between the placement before it and the placement after it. A line that
    // is not in the lyrics at all is free to land in any unoccupied moment.
    if (!isInsideWindow(cursorMs, draftWindow)) return;
    if (!canPlaceAt(cursorMs, lines)) return;

    // Several lines at one moment are a single placement carrying a line
    // break, so they stay together instead of stacking at the same time.
    const text = texts.join("\n");

    setLines((prev) =>
      [
        ...prev.filter((line) => !texts.includes(line.text)),
        { timeMs: cursorMs, text },
      ].sort((a, b) => a.timeMs - b.timeMs)
    );

    setStaticText((prev) =>
      texts.reduce((acc, line) => appendStaticLine(acc, line), prev)
    );
    setAddedTexts((prev) => new Set([...prev, ...texts]));
    setSelectedPlacementKeys([]);
    placementAnchorRef.current = null;
    setDraftText("");
  }

  /**
   * Applies an edit to the static lyrics. Only an added line shifts the
   * timings that follow it, so only an insertion drops placements; rewriting
   * or deleting a line leaves them in place.
   */
  function handleStaticTextChange(next: string) {
    setLines((current) => syncPlacementsToLyrics(staticText, next, current));
    setStaticText(next);
    setSelectedIndices([]);
    staticAnchorRef.current = null;
  }

  function handleRemoveLine(line: ILyricLine) {
    const key = placementKey(line);
    setLines((prev) => prev.filter((entry) => placementKey(entry) !== key));
    setSelectedPlacementKeys((prev) => prev.filter((entry) => entry !== key));
  }

  /** Re-times a placement from a typed value, keeping the list ordered. */
  function handleRetime(line: ILyricLine, value: string) {
    const timeMs = parseTimecode(value);
    if (timeMs === null) return;

    const key = placementKey(line);

    setLines((prev) => {
      // A placement may not cross its neighbours, so the list stays ordered
      // without a validation pass at save time.
      const ordered = [...prev].sort((a, b) => a.timeMs - b.timeMs);
      const index = ordered.findIndex((entry) => placementKey(entry) === key);
      if (index === -1) return prev;

      const before = ordered[index - 1];
      const after = ordered[index + 1];
      if (before && timeMs <= before.timeMs) return prev;
      if (after && timeMs >= after.timeMs) return prev;

      return ordered.map((entry) =>
        placementKey(entry) === key ? { ...entry, timeMs } : entry
      );
    });
  }

  /** Moves a placement to the scrubbed time, staying between its neighbours. */
  function handleRetimeToCursor(line: ILyricLine) {
    const key = placementKey(line);

    setLines((prev) => {
      const ordered = [...prev].sort((a, b) => a.timeMs - b.timeMs);
      const index = ordered.findIndex((entry) => placementKey(entry) === key);
      if (index === -1) return prev;

      const before = ordered[index - 1];
      const after = ordered[index + 1];
      if (before && cursorMs <= before.timeMs) return prev;
      if (after && cursorMs >= after.timeMs) return prev;

      return ordered.map((entry) =>
        placementKey(entry) === key ? { ...entry, timeMs: cursorMs } : entry
      );
    });
  }

  /**
   * Selects a placement, or extends the selection to it when shift-clicked.
   * The chosen lines are mirrored into the draft box so they can be re-placed
   * or edited as a group.
   */
  function handlePlacementClick(line: ILyricLine, extend: boolean) {
    const ordered = [...lines].sort((a, b) => a.timeMs - b.timeMs);
    const key = placementKey(line);
    const lineIndex = timedByIndex.findIndex((entry) => entry === line);

    if (lineIndex !== -1) scrollToLine(lineIndex);

    if (extend && placementAnchorRef.current) {
      const from = ordered.findIndex(
        (entry) => placementKey(entry) === placementAnchorRef.current
      );
      const to = ordered.findIndex((entry) => placementKey(entry) === key);

      if (from >= 0 && to >= 0) {
        const [start, end] = from <= to ? [from, to] : [to, from];
        const range = ordered.slice(start, end + 1);

        setSelectedPlacementKeys(range.map(placementKey));
        setDraftText(range.map((entry) => entry.text).join("\n"));
        return;
      }
    }

    placementAnchorRef.current = key;
    setSelectedPlacementKeys([key]);
    setDraftText(line.text);
  }

  /** Moves every placement by the same amount, clamped at the start. */
  function handleShiftAll(deltaMs: number) {
    if (lines.length === 0) return;

    // Nothing may move before zero, so a negative shift stops at the earliest
    // placement instead of producing invalid timestamps.
    const earliest = Math.min(...lines.map((line) => line.timeMs));
    const applied = Math.max(deltaMs, -earliest);
    if (applied === 0) return;

    setLines((prev) =>
      prev.map((line) => ({ ...line, timeMs: line.timeMs + applied }))
    );
    setShiftMs((current) => current + applied);
  }

  /** Moves the cursor to the previous or next placement. */
  function handleMoveCursor(direction: -1 | 1) {
    const sorted = [...lines].sort((a, b) => a.timeMs - b.timeMs);
    // Going back needs a buffer: playback leaves the cursor a few milliseconds
    // past the placement it started on, so a bare comparison would land on the
    // same line again instead of the one before it.
    const target =
      direction === 1
        ? sorted.find((line) => line.timeMs > cursorMs + 1)
        : [...sorted].reverse().find((line) => line.timeMs < cursorMs - 250);

    if (target) seek(target.timeMs);
  }

  function handleSave() {
    if (issues.length > 0) {
      setError(t("metadata.syncedLyricsMismatch"));
      return;
    }

    onSave({ lyrics: staticText, syncedLyrics: serializeLrc(lines) });
    onOpenChange(false);
  }
  //#endregion

  const content = (
    <>
      {!embedded && (
        <DialogHeader className="sticky top-0 z-sticky -mx-4 -mt-4 overflow-hidden rounded-t-xl border-b bg-popover px-4 py-2.5">
          <div
            className="pointer-events-none absolute inset-0 select-none bg-accent/10 text-accent/10"
            aria-hidden="true"
          >
            <AudioLines className="absolute -left-2 -top-3 size-16 rotate-12" />
            <FileMusic className="absolute left-1/3 -bottom-3 size-12 -rotate-12" />
            <Clock className="absolute -right-3 -top-2 size-16 -rotate-12" />
          </div>

          <div className="relative flex flex-col gap-3 @xl/card-header:flex-row @xl/card-header:items-start @xl/card-header:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20"
                aria-hidden="true"
              >
                <Clock className="size-4" />
              </div>

              <div className="flex min-w-0 flex-col gap-1.5">
                <DialogTitle className="leading-snug">
                  {t("metadata.syncedLyricsEditor")}
                </DialogTitle>
                <DialogDescription>
                  {t("metadata.syncedLyricsEditorDescription")}
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="secondary" className="gap-1 text-foreground">
                <FileMusic className="size-3" />
                {song.title || song.filename}
              </Badge>
              <Badge variant="outline" className="gap-1 tabular-nums">
                <Clock className="size-3" />
                {t("metadata.syncedLyricsPlacementCount", [String(lines.length)])}
              </Badge>
            </div>
          </div>
        </DialogHeader>
      )}

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {t("metadata.syncedLyricsLoadingAudio")}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pt-3 pb-3">
        <WaveformScrubber
          peaks={peaks}
          durationMs={durationMs}
          cursorMs={cursorMs}
          playing={playing}
          disabled={loading}
          markers={sortedLines.map((line) => ({
            timeMs: line.timeMs,
            selected: selectedPlacementKeys.includes(placementKey(line)),
          }))}
          onScrub={handleScrub}
          onTogglePlay={() => void handleTogglePlay()}
          onMarkerSelect={(index) => {
            const line = sortedLines[index];
            if (!line) return;
            seek(line.timeMs);
            handlePlacementClick(line, false);
          }}
          trailing={
            <>
              <span className="text-xs text-muted-foreground">
                {t("metadata.syncedLyricsShiftAll")}
              </span>
              {[-1000, -500, -100, 100, 500, 1000].map((delta) => (
                <Button
                  key={delta}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 font-mono text-xs tabular-nums"
                  disabled={lines.length === 0}
                  onClick={() => handleShiftAll(delta)}
                >
                  {delta > 0 ? `+${delta / 1000}s` : `${delta / 1000}s`}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                disabled={shiftMs === 0}
                onClick={() => handleShiftAll(-shiftMs)}
              >
                {t("metadata.syncedLyricsShiftReset")}
              </Button>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {shiftMs === 0
                  ? "0.000s"
                  : `${shiftMs > 0 ? "+" : ""}${(shiftMs / 1000).toFixed(3)}s`}
              </span>
            </>
          }
        />

        <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 gap-4 overflow-hidden sm:grid-cols-2">
          {/* Timed placements */}
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("metadata.syncedLyricsPlacements")}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={lines.length === 0}
                  onClick={() => handleMoveCursor(-1)}
                >
                  <ChevronLeft /> {t("common.prev")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={lines.length === 0}
                  onClick={() => handleMoveCursor(1)}
                >
                  {t("common.next")} <ChevronRight />
                </Button>
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1 rounded-md border">
              <div ref={placementListRef} className="flex flex-col gap-1 p-2">
                {lines.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    {t("metadata.syncedLyricsNoPlacements")}
                  </p>
                )}

                {[...lines]
                  .sort((a, b) => a.timeMs - b.timeMs)
                  .map((line) => {
                    const picked = selectedPlacementKeys.includes(
                      placementKey(line)
                    );
                    const active = activePlacementKey === placementKey(line);

                    return (
                      <div
                        key={`${line.timeMs}-${line.text}`}
                        data-placement-time={line.timeMs}
                        data-active={active ? "true" : "false"}
                        role="button"
                        tabIndex={0}
                        aria-pressed={picked}
                        aria-current={active ? "true" : undefined}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 ${
                          active
                            ? "bg-accent/60 ring-1 ring-accent"
                            : picked
                              ? "bg-accent/30"
                              : "hover:bg-accent/20"
                        }`}
                        onClick={(event) =>
                          handlePlacementClick(line, event.shiftKey)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handlePlacementClick(line, event.shiftKey);
                          }
                        }}
                      >
                        <Input
                          key={`${line.text}-${line.timeMs}`}
                          defaultValue={formatTimecode(line.timeMs)}
                          aria-label={t("metadata.syncedLyricsRetime")}
                          className="h-7 w-24 shrink-0 font-mono text-xs tabular-nums"
                          onClick={(event) => event.stopPropagation()}
                          onBlur={(event) =>
                            handleRetime(line, event.currentTarget.value)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            }
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {line.text}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("metadata.syncedLyricsSetToCursor")}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRetimeToCursor(line);
                          }}
                        >
                          <Clock />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={t("metadata.syncedLyricsRemove")}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveLine(line);
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Textarea
                value={draftText}
                autoComplete="off"
                rows={2}
                readOnly={sourceLines.length > 0}
                placeholder={
                  sourceLines.length > 0
                    ? t("metadata.syncedLyricsPickFromStatic")
                    : t("metadata.syncedLyricsPlaceholder")
                }
                className="min-h-0 resize-none text-sm"
                onChange={(event) => setDraftText(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleAddLine();
                  }
                }}
              />
              <Button
                type="button"
                size="sm"
                className="w-40 shrink-0"
                disabled={!canAddDraft}
                onClick={handleAddLine}
              >
                <Plus /> {t("metadata.syncedLyricsAddAt", [formatTimecode(cursorMs)])}
              </Button>
            </div>
          </div>

          {/* Static lyrics note */}
          <div className="flex min-h-0 flex-col gap-2 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {t("metadata.syncedLyricsStatic")}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-pressed={previewMode}
                  onClick={() => setPreviewMode((prev) => !prev)}
                >
                  {previewMode ? <X /> : <Eye />}
                  {previewMode
                    ? t("common.close")
                    : t("metadata.syncedLyricsPreview")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={previewMode}
                  onClick={() => setEditingLyrics((prev) => !prev)}
                >
                  {editingLyrics ? <Eye /> : <Pencil />}
                  {editingLyrics
                    ? t("metadata.syncedLyricsView")
                    : t("metadata.syncedLyricsEditMode")}
                </Button>
              </div>
            </div>

            {previewMode ? (
              <SyncedLyricsView
                lines={lines}
                cursorMs={cursorMs}
                className="bg-black p-3"
                lineHeight={36}
                textClassName="text-base font-semibold"
              />
            ) : editingLyrics ? (
              <Textarea
                value={staticText}
                autoComplete="off"
                className="min-h-0 flex-1 resize-none font-mono text-sm"
                onChange={(event) =>
                  handleStaticTextChange(event.currentTarget.value)
                }
              />
            ) : (
              <ScrollArea className="min-h-0 flex-1 rounded-md border">
                <div ref={staticRef} className="flex flex-col gap-0.5 p-3 text-sm">
                  {sourceLines.length === 0 && (
                    <p className="text-muted-foreground">
                      {t("metadata.syncedLyricsNoStatic")}
                    </p>
                  )}

                  {sourceLines.map((text, index) => {
                    const timed = timedByIndex[index];
                    const added = addedTexts.has(text);
                    const selected = selectedIndices.includes(index);
                    const active = index === activeLineIndex;

                    return (
                      <span
                        key={`${index}-${text}`}
                        data-line-index={index}
                        data-added={added ? "true" : "false"}
                        data-active={active ? "true" : "false"}
                        role="button"
                        tabIndex={added ? -1 : 0}
                        aria-pressed={selected}
                        aria-current={active ? "true" : undefined}
                        aria-disabled={added}
                        className={`flex items-baseline gap-2 rounded-sm px-1 ${
                          active
                            ? "bg-accent/60 ring-1 ring-accent"
                            : added
                              ? "cursor-default select-none bg-accent/15 text-accent"
                              : selected
                                ? "cursor-pointer bg-accent/30"
                                : "cursor-pointer hover:bg-accent/20"
                        }`}
                        onClick={(event) => {
                          if (added) return;
                          handleStaticLineClick(index, event.shiftKey);
                        }}
                        onKeyDown={(event) => {
                          if (added) return;
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleStaticLineClick(index, event.shiftKey);
                          }
                        }}
                      >
                        {timed && (
                          <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-accent">
                            {formatTimecode(timed.timeMs)}
                          </span>
                        )}
                        <span className="whitespace-pre-wrap">{text}</span>
                      </span>
                    );
                  })}
                </div>
              </ScrollArea>
            )}

            <p className="text-xs text-muted-foreground">
              {t("metadata.syncedLyricsSelectHint")}
            </p>
          </div>
        </div>

        {issues.length > 0 && (
          <div
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
            role="alert"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span>{t("metadata.syncedLyricsMismatch")}</span>
              {issues.map((issue) => (
                <span key={`${issue.lineIndex}-${issue.text}`} className="text-xs">
                  {issue.reason === "missing"
                    ? t("metadata.syncedLyricsMissing", [issue.text])
                    : t("metadata.syncedLyricsOutOfOrder", [issue.text])}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive"
            role="alert"
          >
            {error}
          </div>
        )}

        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-xl">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={issues.length > 0}>
            {t("common.save")}
          </Button>
        </DialogFooter>

        <audio
          ref={audioRef}
          src={audioUrl}
          className="hidden"
          onTimeUpdate={(event) =>
            setCursorMs(event.currentTarget.currentTime * 1000)
          }
          onLoadedMetadata={(event) => {
            const seconds = event.currentTarget.duration;
            if (Number.isFinite(seconds) && seconds > 0) {
              setDurationMs(seconds * 1000);
            }
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
    </>
  );

  if (embedded) return content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl"
        overlayClassName="bg-black/40 backdrop-blur-sm"
      >
        {content}
      </DialogContent>
    </Dialog>
  );
}
