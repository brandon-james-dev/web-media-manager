/**
 * DTO for the QuickEditForm — the fields the quick-edit strip edits,
 * plus an optional front-cover replacement picked by the user.
 */
export interface QuickEditDto {
  title?: string;
  artist?: string;
  album?: string;
  genre?: string;
  year?: number;
  track?: number;
  coverFront?: Blob;
}
