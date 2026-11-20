/**
 * LRC (timed lyrics) text model.
 *
 * The synced lyrics field stores plain LRC: one `[mm:ss.xx] text` line per
 * placement. Keeping the stored form as LRC means a value read from a
 * provider, a file, or this editor is the same string, and the now-playing
 * view can parse it without a second representation.
 */

/** One timed lyric placement. */
export interface ILyricLine {
  /** Start time in milliseconds. */
  timeMs: number;
  /** The lyric text placed at that time. */
  text: string;
}

/** Why a timed line does not line up with the static lyrics. */
export type SyncIssueReason = "missing" | "out-of-order";

/** A timed line that the static lyrics cannot account for. */
export interface ISyncIssue {
  /** Index into the timed line list. */
  lineIndex: number;
  text: string;
  reason: SyncIssueReason;
}

const TIMESTAMP = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

/** Splits static lyrics into trimmed, non-empty lines. */
export function staticLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

/**
 * Parses LRC text into timed lines, sorted by time.
 *
 * A line may carry several timestamps (a repeated chorus); each becomes its
 * own placement. Lines without a timestamp are ignored, so a file that mixes
 * plain and timed lyrics still parses.
 */
export function parseLrc(text: string | undefined): ILyricLine[] {
  if (!text) return [];

  const lines: ILyricLine[] = [];

  for (const raw of text.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(TIMESTAMP)];
    if (stamps.length === 0) continue;

    const body = raw.replace(TIMESTAMP, "").trim();
    // A timestamp with no text is a gap marker, not a placement.
    if (body === "") continue;

    for (const stamp of stamps) {
      const minutes = Number(stamp[1]);
      const seconds = Number(stamp[2]);
      // LRC fractions are centiseconds when two digits, tenths when one.
      const fraction = Number((stamp[3] ?? "0").padEnd(3, "0").slice(0, 3));

      lines.push({
        timeMs: minutes * 60_000 + seconds * 1000 + fraction,
        text: body,
      });
    }
  }

  return mergeSameTime(lines.sort((a, b) => a.timeMs - b.timeMs));
}

/**
 * Folds lines that share a timestamp into one placement whose text carries a
 * line break, so a two-line lyric placed at one moment round-trips as a single
 * placement instead of two entries at the same time.
 */
function mergeSameTime(lines: ILyricLine[]): ILyricLine[] {
  const merged: ILyricLine[] = [];

  for (const line of lines) {
    const previous = merged[merged.length - 1];

    if (previous && previous.timeMs === line.timeMs) {
      previous.text = `${previous.text}\n${line.text}`;
      continue;
    }

    merged.push({ ...line });
  }

  return merged;
}

/** Formats a time as an LRC timestamp, `[mm:ss.xx]`. */
export function formatTimestamp(ms: number): string {
  const total = Math.max(0, Math.round(ms));

  return `[${pad(Math.floor(total / 60_000), 2)}:${pad(
    Math.floor((total % 60_000) / 1000),
    2
  )}.${pad(Math.floor((total % 1000) / 10), 2)}]`;
}

/** Formats a time for display, `m:ss.mmm`. */
export function formatTimecode(ms: number): string {
  const total = Math.max(0, Math.round(ms));

  return `${Math.floor(total / 60_000)}:${pad(
    Math.floor((total % 60_000) / 1000),
    2
  )}.${pad(total % 1000, 3)}`;
}

/**
 * Parses a typed time back to milliseconds.
 *
 * Accepts `m:ss.mmm`, `m:ss.xx`, or plain seconds, so a hand-typed value and
 * the editor's own display format both round-trip. Returns null when the text
 * is not a time.
 */
export function parseTimecode(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;

  const withMinutes = /^(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?$/.exec(trimmed);

  if (withMinutes) {
    const seconds = Number(withMinutes[2]);
    if (seconds > 59) return null;

    return (
      Number(withMinutes[1]) * 60_000 +
      seconds * 1000 +
      Number((withMinutes[3] ?? "0").padEnd(3, "0").slice(0, 3))
    );
  }

  const plain = /^(\d{1,5})(?:[.:](\d{1,3}))?$/.exec(trimmed);
  if (!plain) return null;

  return (
    Number(plain[1]) * 1000 +
    Number((plain[2] ?? "0").padEnd(3, "0").slice(0, 3))
  );
}

/** Serializes timed lines back to LRC text, sorted by time. */
export function serializeLrc(lines: ILyricLine[]): string {
  return [...lines]
    .sort((a, b) => a.timeMs - b.timeMs)
    .flatMap((line) =>
      // A placement holding several lines becomes one timestamped line each,
      // which is how LRC carries a multi-line lyric at a single moment.
      line.text
        .split(/\r?\n/)
        .map((part) => part.trim())
        .filter((part) => part !== "")
        .map((part) => `${formatTimestamp(line.timeMs)} ${part}`)
    )
    .join("\n");
}

/**
 * Checks that every timed line appears in the static lyrics, in order.
 *
 * The timed lines must be a subsequence of the static lines: partial timing is
 * allowed (some lines timed, others not yet), but a timed line that the static
 * lyrics do not contain, or that appears before an earlier timed line, is a
 * mismatch. That is the rule that keeps the two fields from drifting apart.
 */
export function validateSync(
  staticLyrics: string,
  lines: ILyricLine[]
): ISyncIssue[] {
  const source = staticLines(staticLyrics);
  const issues: ISyncIssue[] = [];
  let cursor = 0;

  lines.forEach((line, lineIndex) => {
    // A placement may hold several lines; each must appear in order.
    const parts = line.text
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter((part) => part !== "");

    for (const text of parts) {
      const found = source.indexOf(text, cursor);

      if (found === -1) {
        issues.push({
          lineIndex,
          text,
          reason: source.includes(text) ? "out-of-order" : "missing",
        });
        return;
      }

      cursor = found + 1;
    }
  });

  return issues;
}

/**
 * Splits a lyrics tag into its plain and timed halves.
 *
 * Files store timed lyrics as LRC inside the ordinary lyrics tag, because the
 * tag library exposes no separate synchronized-lyrics accessor. Reading it back
 * therefore means detecting timestamps: when the text carries them it becomes
 * `syncedLyrics`, and the same lines without timestamps become `lyrics`.
 * Text with no timestamps is plain lyrics and leaves `syncedLyrics` unset.
 */
export function splitTimedLyrics(text: string | undefined): {
  lyrics?: string;
  syncedLyrics?: string;
} {
  if (!text) return {};

  const lines = parseLrc(text);
  if (lines.length === 0) return { lyrics: text };

  return {
    lyrics: lines.map((line) => line.text).join("\n"),
    syncedLyrics: serializeLrc(lines),
  };
}

/**
 * Appends a lyric line to the static lyrics unless it is already there.
 * Returns the text unchanged when the line already appears.
 */
export function appendStaticLine(staticLyrics: string, line: string): string {
  const text = line.trim();
  if (text === "") return staticLyrics;
  if (staticLines(staticLyrics).includes(text)) return staticLyrics;

  const trimmed = staticLyrics.replace(/\s+$/, "");
  return trimmed === "" ? text : `${trimmed}\n${text}`;
}

/**
 * Whether a placement may be added at `timeMs`.
 *
 * A timing may land anywhere the song has room for it, including between two
 * existing placements, so a line missing from the middle of the lyrics can be
 * timed without re-timing everything after it. Only an already occupied moment
 * is refused: two placements at the same time cannot both be right.
 */
export function canPlaceAt(timeMs: number, lines: ILyricLine[]): boolean {
  return !lines.some((line) => Math.abs(line.timeMs - timeMs) < 1);
}

/**
 * The window a placement is allowed to sit in, bounded by its neighbours.
 *
 * A lyric that is in the static text but carries no timing was either never
 * timed or was deliberately removed from the timing side. Either way it has a
 * fixed place in the lyrics, so its timing belongs between the placement before
 * it and the placement after it. `minMs` is null when nothing precedes it and
 * `maxMs` is null when nothing follows it.
 */
export function placementWindow(
  staticLyrics: string,
  lines: ILyricLine[],
  texts: string[]
): { minMs: number | null; maxMs: number | null } {
  const source = staticLines(staticLyrics);
  const ordered = [...lines].sort((a, b) => a.timeMs - b.timeMs);

  // Walk the placements in order, matching each to the static line it carries,
  // so a repeated line maps to its own occurrence rather than the first one.
  const timedAt = new Map<number, number>();
  let cursor = 0;

  for (const line of ordered) {
    const parts = line.text
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter((part) => part !== "");

    const first = parts[0];
    if (first === undefined) continue;

    const index = source.indexOf(first, cursor);
    if (index === -1) continue;

    for (let offset = 0; offset < parts.length; offset++) {
      timedAt.set(index + offset, line.timeMs);
    }

    cursor = index + parts.length;
  }

  const target = texts.find((text) => text.trim() !== "");
  if (target === undefined) return { minMs: null, maxMs: null };

  // Prefer an occurrence the user has removed from timing. When every
  // occurrence is already timed the line is being re-timed, so fall back to the
  // first one: its own placement is excluded by the neighbour scans below, which
  // leaves the gap between the placements either side of it.
  const untimed = source.findIndex(
    (text, index) => text === target.trim() && !timedAt.has(index)
  );
  const at =
    untimed !== -1
      ? untimed
      : source.findIndex((text) => text === target.trim());

  if (at === -1) return { minMs: null, maxMs: null };

  let minMs: number | null = null;
  for (let index = at - 1; index >= 0; index--) {
    const time = timedAt.get(index);
    if (time !== undefined) {
      minMs = time;
      break;
    }
  }

  let maxMs: number | null = null;
  for (let index = at + 1; index < source.length; index++) {
    const time = timedAt.get(index);
    if (time !== undefined) {
      maxMs = time;
      break;
    }
  }

  return { minMs, maxMs };
}

/**
 * Whether `timeMs` sits strictly inside a window. A null bound is open, so an
 * untimed first line may be placed any time before the next placement.
 */
export function isInsideWindow(
  timeMs: number,
  window: { minMs: number | null; maxMs: number | null }
): boolean {
  if (window.minMs !== null && timeMs <= window.minMs) return false;
  if (window.maxMs !== null && timeMs >= window.maxMs) return false;

  return true;
}

/**
 * Drops the placements that an insertion invalidated.
 *
 * Adding a line shifts everything after it, so the timings that follow the
 * insertion no longer line up and are removed. Rewriting or deleting a line
 * leaves the placements alone: the user is editing the text, not re-timing the
 * song, and wiping every later timing on each keystroke made the editor
 * unusable.
 */
export function trimPlacementsAfterInsertion(
  previousLyrics: string,
  nextLyrics: string,
  lines: ILyricLine[]
): ILyricLine[] {
  const previous = staticLines(previousLyrics);
  const next = staticLines(nextLyrics);

  // Only an addition shifts the lines that follow it.
  if (next.length <= previous.length) return lines;

  let insertedAt = 0;
  while (
    insertedAt < previous.length &&
    previous[insertedAt] === next[insertedAt]
  ) {
    insertedAt++;
  }

  // Keep the placements that sit before the inserted line. Positions are
  // mapped through the insertion rather than searched for by text: a lyric that
  // repeats would otherwise match its earlier occurrence and shift every later
  // timing onto the wrong line.
  const shift = next.length - previous.length;
  const kept: ILyricLine[] = [];
  let cursor = 0;

  for (const line of [...lines].sort((a, b) => a.timeMs - b.timeMs)) {
    const parts = lineParts(line);

    if (parts.length === 0) continue;

    const index = previous.indexOf(parts[0], cursor);

    // A placement whose line is no longer present cannot be located, so it is
    // treated as sitting where the cursor already is. That keeps it when the
    // insertion is later in the song and drops it when the insertion is before
    // it, which is what "remove the timings after the added line" means.
    if (index === -1) {
      if (cursor >= insertedAt) break;
      kept.push(line);
      continue;
    }

    const mapped = index < insertedAt ? index : index + shift;

    if (mapped >= insertedAt) break;

    kept.push(line);
    cursor = index + parts.length;
  }

  return kept;
}

/**
 * Keeps the placements in step with an edit to the static lyrics.
 *
 * A rewrite (same line count) keeps every timing and adopts the new text, so
 * fixing a typo in the lyrics fixes the placement that carries it. An insertion
 * or a deletion shifts the lines that follow, so those timings are dropped
 * instead of being left pointing at the wrong line.
 */
export function syncPlacementsToLyrics(
  previousLyrics: string,
  nextLyrics: string,
  lines: ILyricLine[]
): ILyricLine[] {
  const previous = staticLines(previousLyrics);
  const next = staticLines(nextLyrics);

  if (next.length > previous.length) {
    return trimPlacementsAfterInsertion(previousLyrics, nextLyrics, lines);
  }

  if (next.length < previous.length) {
    let common = 0;
    while (common < next.length && previous[common] === next[common]) common++;

    const kept: ILyricLine[] = [];
    let cursor = 0;

    for (const line of [...lines].sort((a, b) => a.timeMs - b.timeMs)) {
      const parts = lineParts(line);

      if (parts.length === 0) continue;

      // Advance through the previous lyrics so a repeated line maps to its own
      // occurrence instead of the first one.
      const index = previous.indexOf(parts[0], cursor);

      if (index === -1 || index + parts.length > common) continue;

      kept.push(line);
      cursor = index + parts.length;
    }

    return kept;
  }

  const ordered = [...lines].sort((a, b) => a.timeMs - b.timeMs);
  const updated: ILyricLine[] = [];
  let cursor = 0;

  for (const line of ordered) {
    const parts = lineParts(line);
    const index = previous.indexOf(parts[0], cursor);

    if (index === -1) {
      updated.push(line);
      continue;
    }

    const replacement = next.slice(index, index + parts.length);

    if (replacement.length !== parts.length) {
      updated.push(line);
      continue;
    }

    updated.push({ timeMs: line.timeMs, text: replacement.join("\n") });
    cursor = index + parts.length;
  }

  return updated;
}

/** The non-empty lines a placement carries. */
function lineParts(line: ILyricLine): string[] {
  return line.text
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

/**
 * Maps each static lyric line to the placement that times it.
 *
 * Placements are walked in time order against the lyrics in order, so a line
 * that repeats maps to its own occurrence. Looking a line up by text alone
 * would give every repeat the first occurrence's timing.
 */
export function mapPlacementsToLines(
  staticLyrics: string,
  lines: ILyricLine[]
): Array<ILyricLine | undefined> {
  const source = staticLines(staticLyrics);
  const mapped: Array<ILyricLine | undefined> = Array.from({
    length: source.length,
  });
  let cursor = 0;

  for (const line of [...lines].sort((a, b) => a.timeMs - b.timeMs)) {
    const parts = lineParts(line);
    if (parts.length === 0) continue;

    let start = -1;
    let at = cursor;
    let matched = true;

    for (const part of parts) {
      const found = source.indexOf(part, at);

      if (found === -1) {
        matched = false;
        break;
      }

      if (start === -1) start = found;
      at = found + 1;
    }

    if (!matched) continue;

    for (let index = start; index < at; index++) {
      mapped[index] = line;
    }

    cursor = at;
  }

  return mapped;
}
