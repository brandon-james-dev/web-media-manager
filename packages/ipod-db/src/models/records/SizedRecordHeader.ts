import type { IpodContainerRecord } from "./IpodContainerRecord";

export interface SizedRecordHeader extends IpodContainerRecord {
  headerLength: number;
  totalLength: number;
}
