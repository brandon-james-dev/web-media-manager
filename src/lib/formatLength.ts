/**
 * Format a duration in seconds as `m:ss` (0/undefined → `0:00`).
 *
 * Shared by the surfaces that list song lengths — the track item rows, the
 * song table's duration column, and the album detail dialog's track list.
 * The sync writer's counterparty for iPod database rows
 * (`lib/sync/helpers/formatTrackDuration`) is deliberately separate: it takes
 * milliseconds and grows an hour component past an hour.
 */
export function formatLength(length: number | undefined): string {
  if (!length) return "0:00";
  const m = Math.floor(length / 60);
  const s = String(Math.floor(length % 60)).padStart(2, "0");
  return `${m}:${s}`;
}
