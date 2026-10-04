export interface MhypRecord {
  tag: string;

  headerLength: number;
  totalLength: number;

  numMhod: number;
  numItems: number;

  hidden: number;

  timestamp: number;

  playlistId: number;

  unknown3: number;
  unknown4: number;
  unknown5: number;
}
