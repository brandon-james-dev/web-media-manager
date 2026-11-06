import type { MusicSource, Playlist } from "@/models";

/**
 * A playlist is read-only when it came from a source that cannot persist
 * playlists (`capabilities.playlistWrite === false`, e.g. a Subsonic
 * server): edits would only diverge from what the source holds and be lost
 * on the next sync. App-created playlists (no `sourceId`) are always
 * editable. A playlist whose source is no longer known is treated as
 * read-only too, since there is nowhere to write it back to.
 */
export function isPlaylistReadOnly(
  playlist: Pick<Playlist, "sourceId">,
  sources: Pick<MusicSource, "id" | "capabilities">[]
): boolean {
  if (!playlist.sourceId) return false;
  const source = sources.find((s) => s.id === playlist.sourceId);
  return !source || !source.capabilities.playlistWrite;
}
