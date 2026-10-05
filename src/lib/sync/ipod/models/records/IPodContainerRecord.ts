import type { IpodRecord } from ".";

export interface IpodContainerRecord extends IpodRecord {
  headerLength: number;
  childCount: number;
  childTag?: string;
}
