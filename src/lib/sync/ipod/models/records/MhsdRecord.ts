import type { IpodRecord } from "./IpodRecord";

export interface MhsdRecord extends IpodRecord {
  type: number;
  childTag?: string;
}
