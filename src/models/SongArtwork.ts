import type { ArtworkType } from "../lib/contracts";

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
