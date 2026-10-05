import type { IpodContainerRecord } from "./IPodContainerRecord";

export interface SizedRecordHeader extends IpodContainerRecord {
  headerLength: number;
  totalLength: number;
}
