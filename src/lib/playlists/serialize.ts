import type { Playlist } from "@/models";

/**
 * Serialize a playlist to M3U8 text with relative, `/`-separated paths.
 *
 * Format:
 *   #EXTM3U
 *   #EXTINF:,,PlaylistName
 *   relative/path/to/track.mp3
 */
export function serializePlaylist(
  playlist: Playlist,
  options?: { songPaths: (id: string) => string | undefined }
): string {
  const lines: string[] = ["#EXTM3U"];

  for (const entry of playlist.songs) {
    const path = options?.songPaths(entry.songId);
    if (!path) continue;
    lines.push(`#EXTINF:,,${playlist.name}`);
    lines.push(path.replace(/\\/g, "/"));
  }

  return `${lines.join("\n")}\n`;
}
