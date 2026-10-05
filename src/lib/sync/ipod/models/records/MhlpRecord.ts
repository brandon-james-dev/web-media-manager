import type { IpodRecord } from ".";

export interface MhlpRecord extends IpodRecord {
  headerLength: number;
  totalLength: number;
}
