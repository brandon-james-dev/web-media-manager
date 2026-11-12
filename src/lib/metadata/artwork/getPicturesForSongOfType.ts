import { getSongArtworkStore } from "@/lib/persistence/songArtworkStore";
import { ArtworkType, type IPicture } from "../../contracts";
import { ThumbnailSize } from "./resizeBitmap";

export async function getPicturesForSongOfType(
  songId: string,
  type: ArtworkType = ArtworkType.FrontCover,
  thumbSize: ThumbnailSize = ThumbnailSize.thumb256
): Promise<IPicture | undefined> {
  const artwork = await getSongArtworkStore().getBySongAndType(songId, type);

  if (!artwork) return undefined;

  const key = thumbSize == undefined ? "full" : "thumb" + thumbSize;

  return {
    type: artwork?.artworkType ?? ArtworkType.Other,
    mimeType: "image/jpeg",
    description: "",
    data: new Uint8Array(await (artwork as any)[key].arrayBuffer()),
  };
}
