import type { SyncDevice, SyncDeviceRecord } from "@/models";

export function mapSyncDeviceToRecord(device: SyncDevice): SyncDeviceRecord {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    rootHandle: device.rootHandle,
    createdAt: device.createdAt,
  };
}
