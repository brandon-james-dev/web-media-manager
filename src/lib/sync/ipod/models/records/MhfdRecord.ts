import type { IpodRecord } from ".";

export interface MhfdRecord extends IpodRecord {
  headerLength: number;
  totalLength: number;
  childCount: number;

  field0: number;
  field1: number;
  field2: number;
  field3: number;
}
