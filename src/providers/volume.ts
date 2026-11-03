export const VOLUME_STORAGE_KEY = "wmm.volume";
export const DEFAULT_VOLUME = 0.75;

/** Restore the persisted volume, or the default when nothing (or an invalid
 *  value) was stored. Clamps to [0, 1]. */
export function restoreVolume(stored: string | null): number {
  if (stored === null || stored.trim() === "") return DEFAULT_VOLUME;
  const parsed = Number(stored);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : DEFAULT_VOLUME;
}
