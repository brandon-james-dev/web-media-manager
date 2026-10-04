import { getMetadataDb } from "@/lib/dexie-utils";
import type { SongArtwork } from "@/models";

export async function getArtworkForSong(
  songId: string
): Promise<SongArtwork[]> {
  const db = getMetadataDb();
  return await db.songArtwork.where("songId").equals(songId).toArray();
}
