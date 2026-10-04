export interface MhiaRecord {
  tag: string;
  headerLength: number;
  totalLength: number;
  id?: number;

  field20?: number;
  field24?: number;
  field28?: number;
}
