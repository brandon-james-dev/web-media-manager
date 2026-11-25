/** Unit `value` is measured in: song records carry seconds, iPod rows millis. */
export type DurationUnit = "s" | "ms";

/**
 * Format a track duration as `m:ss`, or `h:mm:ss` past an hour.
 *
 * `unit` says what `value` is measured in. Song records and playback
 * positions carry seconds, which is the default; the sync writer's iPod
 * database rows carry milliseconds. A missing, non-finite or negative value
 * formats as `--:--`; zero formats as `0:00`.
 *
 * @example
 * ```ts
 * formatTrackDuration(245);        // "4:05"
 * formatTrackDuration(3725);       // "1:02:05"
 * formatTrackDuration(245000, "ms"); // "4:05"
 * formatTrackDuration(undefined);  // "--:--"
 * ```
 */
export function formatTrackDuration(
  value: number | undefined,
  unit: DurationUnit = "s"
): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return "--:--";
  }

  const totalSeconds = Math.floor(unit === "ms" ? value / 1000 : value);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");

  return hours > 0
    ? `${hours}:${`${minutes}`.padStart(2, "0")}:${seconds}`
    : `${hours + minutes}:${seconds}`;
}
