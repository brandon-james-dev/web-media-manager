import { getPicturesForSongOfType } from "@/lib/metadata/artwork/getPicturesForSongOfType";
import type { IPicture } from "@/lib/contracts/IPicture";
import { ArtworkType } from "@/lib/contracts/ArtworkType";
import { ThumbnailSize } from "@/lib/metadata/artwork/resizeBitmap";

/**
 * Domain: Media.
 * Stream source resolution — returns the artwork picture for a given type
 * and size. Open Subsonic equivalent: getCoverArt / getPictures.
 */
export async function getPictureOfType(
  songId: string,
  type?: ArtworkType,
  thumbSize?: ThumbnailSize
): Promise<IPicture | undefined> {
  return await getPicturesForSongOfType(
    songId,
    type ?? ArtworkType.FrontCover,
    thumbSize ?? ThumbnailSize.thumb256
  );
}
