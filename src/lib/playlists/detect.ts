/** Playlist file extensions the music scan recognizes. */
export const PLAYLIST_EXTENSIONS = [".m3u8", ".m3u"] as const;
export type PlaylistFileExtension = (typeof PLAYLIST_EXTENSIONS)[number];

/** True when a file name is a playlist file (case-insensitive). */
export function isPlaylistFile(name: string): boolean {
  const lower = name.toLowerCase();
  return PLAYLIST_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
