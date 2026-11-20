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
 * Drops the placements that a lyrics edit invalidated.
 *
 * Editing the static lyrics can rewrite, move, or delete lines that already
 * carry a timing. Rather than diffing against the previous text, this keeps the
 * longest run of placements that still appear in the lyrics in order and drops
 * everything from the first mismatch onward. That survives intermediate states
 * (a cleared box, a paste) and matches what `validateSync` checks.
 */
export function trimPlacementsToLyrics(
  lyrics: string,
  lines: ILyricLine[]
): ILyricLine[] {
  const source = staticLines(lyrics);
  const ordered = [...lines].sort((a, b) => a.timeMs - b.timeMs);
  const kept: ILyricLine[] = [];
  let cursor = 0;

  for (const line of ordered) {
    const parts = line.text
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter((part) => part !== "");

    let next = cursor;
    let matches = true;

    for (const part of parts) {
      const found = source.indexOf(part, next);

      if (found === -1) {
        matches = false;
        break;
      }

      next = found + 1;
    }

    // The first placement that no longer fits ends the valid run: later
    // placements were timed against lyrics that have since moved.
    if (!matches) break;

    kept.push(line);
    cursor = next;
  }

  return kept;
}
