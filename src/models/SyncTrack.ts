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
  artworkId?: string;
}
