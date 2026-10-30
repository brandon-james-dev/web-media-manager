/**
 * Contract types aligned with the Open Subsonic API ID3 models.
 * These are plain, JSON-safe views — never Blobs or FileSystemHandles.
 * Mappers in ./mappers convert domain (Song/Directory) → contract.
 */

/** Open Subsonic `Child` — a track. */
export interface Child {
  id: string;
  title: string;
  artist?: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  coverArt?: string; // songId ref, resolved via coverArt endpoint
  genre?: string;
  year?: number;
  track?: number;
  discNumber?: number;
  duration?: number;
  bitRate?: number;
  size?: number;
  path?: string;
  suffix?: string;
  isDir?: boolean;
  isVideo?: boolean;
}

/** Open Subsonic `AlbumID3`. */
export interface AlbumID3 {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount: number;
  duration?: number;
  playCount?: number;
  year?: number;
  genre?: string;
  created?: string;
}

/** Open Subsonic `ArtistID3`. */
export interface ArtistID3 {
  id: string;
  name: string;
  coverArt?: string;
  albumCount?: number;
}

/** Open Subsonic `Genre`. */
export interface Genre {
  name: string;
  songCount?: number;
  albumCount?: number;
}

/** Open Subsonic `MusicFolder`. */
export interface MusicFolder {
  id: string;
  name: string;
}
