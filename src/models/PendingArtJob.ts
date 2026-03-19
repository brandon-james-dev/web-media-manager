export interface PendingArtJob {
  id?: number;
  songId: string;
  directoryHandle: FileSystemDirectoryHandle,
  createdAt: number;
}
