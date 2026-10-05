export interface IpodTrack {
  id?: number;

  title?: string;
  artist?: string;
  album?: string;
  genre?: string;

  year?: number;

  durationMs?: number;
  sizeBytes?: number;

  fileType?: string;

  dbPath?: string;
  filePath?: string;
}
