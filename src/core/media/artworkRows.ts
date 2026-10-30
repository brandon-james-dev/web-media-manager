import { getArtworkForSong } from "@/lib/metadata/artwork/getArtworkForSong";
import type { SongArtwork } from "@/models";

/** Raw artwork rows for a song (thumbnails included). */
export async function getArtworkRows(songId: string): Promise<SongArtwork[]> {
  return await getArtworkForSong(songId);
}
