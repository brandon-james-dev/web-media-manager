import type { ArtworkType } from "../lib/metadata-utils";

export interface SongArtwork {
  id?: number;
  songId: string;
  hasEmbedded: boolean;

  artworkType?: ArtworkType;

  full?: Blob;
  thumb64?: Blob;
  thumb128?: Blob;
  thumb256?: Blob;
  thumb512?: Blob;
}
