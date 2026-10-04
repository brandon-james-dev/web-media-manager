export interface MhbdRecord {
  tag: "mhbd";
  headerLength: number;
  totalLength: number;
  childCount: number;
}
