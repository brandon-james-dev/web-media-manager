import type { ThumbnailSize } from "@/lib";
import type { ArtworkType } from "@/lib/contracts";

export interface AlbumArtImageProps {
  songId?: string;
  artworkType?: ArtworkType;
  thumbSize?: ThumbnailSize;
  fallback?: React.ReactNode;
  className?: string;
}
