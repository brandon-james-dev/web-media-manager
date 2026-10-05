export interface MhitRecord {
  trackId: number;
  tag: string;
  headerLength: number;
  totalLength: number;
  durationMs?: number;
  sizeBytes?: number;
  year?: number;
}
