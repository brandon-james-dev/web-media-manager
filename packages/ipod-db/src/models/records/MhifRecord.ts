import type { IpodRecord } from ".";

export interface MhifRecord extends IpodRecord {
  headerLength: number;
  recordLength: number;
  formatId: number;
  imageSize: number;
}
