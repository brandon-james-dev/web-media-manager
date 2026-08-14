import { ThumbnailSize } from "./resizeBitmap";
import { useState, useEffect } from "react";
import { getPicturesForSongOfType } from ".";
import { ArtworkType, type IPicture } from "./metadata-utils";

export function useArtwork(
  songId: string,
  artworkType: ArtworkType,
  thumbSize?: ThumbnailSize
) {
  const [artwork, setArtwork] = useState<IPicture[]>([]);

  useEffect(() => {
    let cancelled = false;

    getPicturesForSongOfType(songId, artworkType, thumbSize).then((a) => {
      if (!cancelled) setArtwork(a);
    });

    return () => {
      cancelled = true;
    };
  }, [songId, artworkType, thumbSize]);

  return artwork;
}
