import { getPicturesForSongOfType } from "@/lib/getPicturesForSongOfType";
import type { IPicture } from "@/lib/contracts/IPicture";
import type { ArtworkType } from "@/lib/contracts/ArtworkType";

/**
 * Domain: Media.
 * Stream source resolution — returns the artwork picture for a given type
 * and size. Open Subsonic equivalent: getCoverArt / getPictures.
 */
export async function getPictureOfType(
  songId: string,
  type: ArtworkType,
  thumbSize: number
): Promise<IPicture | undefined> {
  return await getPicturesForSongOfType(songId, type, thumbSize);
}
