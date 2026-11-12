import type { Song } from "@/models";

const APP_FIELDS = new Set(["id", "pictures", "addedAt", "updatedAt"]);

function fingerprint(song: Song): string {
  const entries = Object.entries(song)
    .filter(([key, value]) => !APP_FIELDS.has(key) && value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(entries);
}

/** Whether the file-derived data of two songs is identical. */
export function hasSameContent(a: Song, b: Song): boolean {
  return fingerprint(a) === fingerprint(b);
}

/**
 * Stamp the app-owned dates on a freshly collected song. A song already in
 * the library keeps its `addedAt`; `updatedAt` only moves when its content
 * differs from the stored copy. Returns whether anything changed.
 */
export function stampSong(song: Song, existing: Song | undefined, now: number) {
  if (existing && hasSameContent(song, existing)) {
    song.addedAt = existing.addedAt ?? now;
    song.updatedAt = existing.updatedAt ?? existing.addedAt ?? now;
    return false;
  }
  song.addedAt = existing?.addedAt ?? now;
  song.updatedAt = now;
  return true;
}
