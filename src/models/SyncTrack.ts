export interface SyncTrack {
  id: number;
  title?: string;
  artist?: string;
  album?: string;
  /** Album artist as the device records it, when it differs from `artist`. */
  albumArtist?: string;
  /** Track length in milliseconds, as the device database stores it. */
  durationMs?: number;
  genre?: string;
  year?: number;
  trackNumber?: number;
  trackTotal?: number;
  discNumber?: number;
  discTotal?: number;
  bitrate?: number;
  /** Times the device has played this track. */
  playCount?: number;
  /** Device rating, on the device's own scale. */
  rating?: number;
  /** Device codec identifier, as the database records it. */
  codecId?: number;
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
