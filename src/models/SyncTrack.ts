export interface SyncTrack {
  id: number;
  title?: string;
  artist?: string;
  album?: string;
  /** Track length in milliseconds, as the device database stores it. */
  durationMs?: number;
  genre?: string;
  year?: number;
  trackNumber?: number;
  trackTotal?: number;
  discNumber?: number;
  discTotal?: number;
  bitrate?: number;
  /** File size in bytes, as the device database records it. */
  fileSize?: number;
  /**
   * The track's location on the device, as the database stores it
   * (`:iPod_Control:Music:F03:Song.mp3`). Needed to read its audio back.
   */
  path?: string;
  artworkId?: string;
  /**
   * The track's cover art, decoded from the device's ArtworkDB during a scan.
   * Held in memory only — it belongs to the device and is not persisted.
   */
  artwork?: Blob;
}
