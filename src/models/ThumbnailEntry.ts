export interface ThumbnailEntry {
  songId: string;

  original: Blob | null;

  thumbSmall: Blob | null;
  thumbMedium: Blob | null;
  thumbLarge: Blob | null;
  thumbXLarge: Blob | null;

  mtime: number;
}
