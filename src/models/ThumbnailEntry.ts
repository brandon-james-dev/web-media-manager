export interface ThumbnailEntry {
  songId: string;

  original: Blob | null;

  thumbSmall: Blob | null;
  thumbLarge: Blob | null;

  mtime: number;
}
