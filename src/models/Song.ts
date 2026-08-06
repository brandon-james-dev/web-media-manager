export interface Song {
  id: string;
  path: string;

  // Tag fields
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  composer?: string;
  genre?: string;
  comment?: string;
  year?: number;
  track?: number;
  disc?: number;

  coverFront?: Blob;
  coverBack?: Blob;

  lyrics?: string;
  copyright?: string;
  publisher?: string;
  encodedBy?: string;
  bpm?: number;
  language?: string;
  media?: string;
  mood?: string;
  isrc?: string;
  barcode?: string;
  catalogNumber?: string;

  mbTrackId?: string;
  mbArtistId?: string;
  mbAlbumId?: string;
  mbAlbumArtistId?: string;
  mbReleaseGroupId?: string;

  // Properties fields (readonly)
  fileSizeBytes: number;

  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  length?: number;
}
