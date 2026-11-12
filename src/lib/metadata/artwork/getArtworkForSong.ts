import { getSongArtworkStore } from "@/lib/persistence/songArtworkStore";
import type { SongArtwork } from "@/models";

export async function getArtworkForSong(
  songId: string
): Promise<SongArtwork[]> {
  return await getSongArtworkStore().getBySong(songId);
}
