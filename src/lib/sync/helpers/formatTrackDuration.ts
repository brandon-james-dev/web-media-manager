/** Format a millisecond duration as `m:ss` (or `h:mm:ss`). */
export function formatTrackDuration(durationMs?: number): string {
  if (!durationMs || durationMs < 0) return "--:--";

  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const seconds = `${totalSeconds % 60}`.padStart(2, "0");

  return hours > 0
    ? `${hours}:${`${minutes}`.padStart(2, "0")}:${seconds}`
    : `${hours + minutes}:${seconds}`;
}
