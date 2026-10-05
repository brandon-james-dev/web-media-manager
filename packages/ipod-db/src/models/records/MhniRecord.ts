import type { IpodRecord } from ".";

export interface MhniRecord extends IpodRecord {
  headerLength: number;
  totalLength: number;
}
