import { getPicturesForSong } from "@/lib/getPicturesForSong";
import type { IPicture } from "@/lib/contracts/IPicture";

/**
 * Domain: Media.
 * Open Subsonic equivalent: getLyrics / artwork (per-song in-file pictures).
 * Returns all embedded pictures for a song regardless of storage cache.
 */
export async function getSongPictures(songId: string): Promise<IPicture[]> {
  return await getPicturesForSong(songId);
}
