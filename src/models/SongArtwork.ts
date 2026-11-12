import type { ArtworkType } from "../lib/contracts";

export interface SongArtwork {
  id?: number;
  songId: string;
  hasEmbedded: boolean;

  artworkType?: ArtworkType;

  /** When the app first generated this artwork (epoch ms). */
  addedAt?: number;

  /**
   * When the app last regenerated this artwork (epoch ms). Compared with the
   * song's `updatedAt` to decide whether a resync needs new thumbnails.
   */
  updatedAt?: number;

  full?: Blob;
  thumb64?: Blob;
  thumb128?: Blob;
  thumb256?: Blob;
  thumb512?: Blob;
}
