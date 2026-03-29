/**
 * Holds the thumbnail data for a range of image sizes generated from
 * the album art in an audio file. These images are primarily used for
 * different interface elements.
 */
export interface ThumbnailEntry {
  /**
   * A reference to the song the thumbnail was pulled from
   */
  songId: string;

  /**
   * The original photo data pulled from the song
   */
  original: Blob | null;

  /**
   * A 64x64 photo resized from the original
   */
  thumbSmall: Blob | null;
  
  /**
   * A 128x128 photo resized from the original
   */
  thumbMedium: Blob | null;
  
  /**
   * A 256x256 photo resized from the original
   */
  thumbLarge: Blob | null;
  
  /**
   * A 512x512 photo resized from the original
   */
  thumbXLarge: Blob | null;

  /**
   * A timestame for when this entry was created
   */
  createdAt: number;
}
