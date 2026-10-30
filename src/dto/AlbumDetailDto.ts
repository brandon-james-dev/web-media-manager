/**
 * DTO for the AlbumDetailDialog — album-level metadata plus the per-song
 * track/title rows the dialog edits, and an optional front-cover.
 */
export interface AlbumDetailDto {
  albumTitle?: string;
  albumArtist?: string;
  songs: { id: string; track?: number; title?: string }[];
  coverFront?: Blob;
}
