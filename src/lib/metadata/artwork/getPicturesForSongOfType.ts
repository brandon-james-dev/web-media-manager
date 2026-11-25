import { getSongArtworkStore } from "@/lib/persistence/songArtworkStore";
import { resolveDeviceArtwork } from "@/lib/sync/deviceArtwork";
import { ArtworkType, type IPicture } from "../../contracts";
import { ThumbnailSize } from "./resizeBitmap";

export async function getPicturesForSongOfType(
  songId: string,
  type: ArtworkType = ArtworkType.FrontCover,
  thumbSize?: ThumbnailSize
): Promise<IPicture | undefined> {
  const artwork = await getSongArtworkStore().getBySongAndType(songId, type);

  if (!artwork) {
    // A sync device's tracks have no row in the artwork table: their covers
    // live in the device's own ArtworkDB and are held in memory while it is
    // connected. Without this fallback every device track showed a blank tile.
    // Resolving may read the cover off the device on first use.
    const deviceArtwork = await resolveDeviceArtwork(songId);
    if (!deviceArtwork) return undefined;

    return {
      type,
      mimeType: deviceArtwork.type || "image/png",
      description: "",
      data: new Uint8Array(await deviceArtwork.arrayBuffer()),
    };
  }

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
