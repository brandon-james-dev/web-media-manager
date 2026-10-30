import { ThumbnailSize } from "../lib/metadata/artwork/resizeBitmap";
import { useState, useEffect } from "react";
import { getPictureOfType } from "@/core/media";
import { ArtworkType, type IPicture } from "../lib/contracts";

export function useArtwork(
  songId: string,
  artworkType: ArtworkType,
  thumbSize?: ThumbnailSize
) {
  const [artwork, setArtwork] = useState<IPicture>();

  useEffect(() => {
    let cancelled = false;

    getPictureOfType(songId, artworkType, thumbSize).then((a) => {
      if (!cancelled) setArtwork(a);
    });

    return () => {
      cancelled = true;
    };
  }, [songId, artworkType, thumbSize]);

  return artwork;
}
