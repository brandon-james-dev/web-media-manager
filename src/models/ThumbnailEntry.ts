export interface ThumbnailEntry {
  songId: string;

  originalSize: Blob | null;

  thumb64: Blob | null;
  thumb128: Blob | null;

  mtime: number;
}
