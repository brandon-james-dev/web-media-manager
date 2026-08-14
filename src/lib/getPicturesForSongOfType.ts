import { getMetadataDb } from "@/lib/dexie-utils";
import { ArtworkType, type IPicture } from "./metadata-utils";
import { ThumbnailSize } from "./resizeBitmap";

export async function getPicturesForSongOfType(
  songId: string,
  type: ArtworkType,
  thumbSize: ThumbnailSize | undefined = ThumbnailSize.thumb256
): Promise<IPicture[]> {
  const db = getMetadataDb();

  const rows = await db.songArtwork
    .where("songId")
    .equals(songId)
    .filter((row) => row.artworkType === type)
    .toArray();

  const key = thumbSize == undefined ? "full" : "thumb" + thumbSize;

  return Promise.all(
    rows.map(async (art) => ({
      type: art.artworkType ?? ArtworkType.Other,
      mimeType: "image/jpeg",
      description: "",
      data: new Uint8Array(await (art as any)[key].arrayBuffer()),
    }))
  );
}
