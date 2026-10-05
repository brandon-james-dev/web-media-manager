import type { IpodRecord } from "./IpodRecord";

export interface MhsdRecord extends IpodRecord {
  type: number;
  headerLength: number;
  totalLength: number;
  childTag: string;
}
