export interface MhipRecord {
  tag: string;

  headerLength: number;
  totalLength: number;

  playlistItemId: number;
  trackIndex: number;
}
