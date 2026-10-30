/**
 * DTO for the SongEditForm — the metadata fields the advanced song editor
 * edits, plus an optional front-cover replacement.
 */
export interface SongEditDto {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  genre?: string;
  year?: number;
  track?: number;
  totalTracks?: number;
  discNumber?: number;
  totalDiscs?: number | string;
  composer?: string;
  bpm?: number;
  copyright?: string;
  encodedBy?: string;
  comment?: string;
  lyrics?: string;
  coverFront?: Blob;
}
