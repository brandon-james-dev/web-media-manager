import type { IPicture } from "./IPicture";

export interface ITagData {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  comment?: string;
  composer?: string;
  year?: number;
  track?: number;
  totalTracks?: number;
  disc?: number;
  totalDiscs?: number;

  lyrics?: string;
  copyright?: string;
  encodedBy?: string;
  bpm?: number;
  isrc?: string;

  pictures?: IPicture[];

  mbTrackId?: string;
  mbArtistId?: string;
  mbReleaseGroupId?: string;
}
