import { getMetadataDb } from "@/lib/dexie-utils";
import { ArtworkType, type IPicture } from "./metadata-utils";
import { ThumbnailSize } from "./resizeBitmap";

export async function getPicturesForSongOfType(
  songId: string,
  type: ArtworkType = ArtworkType.FrontCover,
  thumbSize: ThumbnailSize = ThumbnailSize.thumb256
): Promise<IPicture | undefined> {
  const db = getMetadataDb();

  const artwork = await db.songArtwork
    .where("songId")
    .equals(songId)
    .filter((row) => row.artworkType === type)
    .first();

  if (!artwork) return undefined;

  const key = thumbSize == undefined ? "full" : "thumb" + thumbSize;

  return {
    type: artwork?.artworkType ?? ArtworkType.Other,
    mimeType: "image/jpeg",
    description: "",
    data: new Uint8Array(await (artwork as any)[key].arrayBuffer()),
  };
}
