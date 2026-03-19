export interface PendingArtJob {
  id?: number;
  songId: string;
  fileHandle: FileSystemFileHandle,
  createdAt: number;
}
