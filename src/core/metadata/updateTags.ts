import type { Song } from "@/models";
import { applySongEdits } from "@/lib/applySongEdits";
import type { SongEditCallbacks } from "./types";

/**
 * Domain: Media annotation.
 * Open Subsonic equivalent: updateSong / updateAlbum (tag write).
 *
 * Applies tag updates to a song and persists via the combined store.
 * Wraps the existing `applySongEdits`.
 */
export async function updateTags(
  song: Song,
  updates: Partial<Song>,
  callbacks?: SongEditCallbacks
): Promise<Song> {
  return applySongEdits(song, updates, callbacks);
}
