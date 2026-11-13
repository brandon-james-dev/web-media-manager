import { getSongArtworkStore } from "@/lib/persistence/songArtworkStore";
import { ArtworkType, type IPicture } from "../../contracts";
import { ThumbnailSize } from "./resizeBitmap";

export async function getPicturesForSongOfType(
  songId: string,
  type: ArtworkType = ArtworkType.FrontCover,
  thumbSize?: ThumbnailSize
): Promise<IPicture | undefined> {
  const artwork = await getSongArtworkStore().getBySongAndType(songId, type);

  if (!artwork) return undefined;

  const blob =
    thumbSize == undefined
      ? (artwork.full ??
        artwork.thumb512 ??
        artwork.thumb256 ??
        artwork.thumb128 ??
        artwork.thumb64)
      : (artwork as unknown as Record<string, Blob | undefined>)[
          "thumb" + thumbSize
        ];

  if (!blob) return undefined;

  return {
    type: artwork.artworkType ?? ArtworkType.Other,
    mimeType: "image/jpeg",
    description: "",
    data: new Uint8Array(await blob.arrayBuffer()),
  };
}
