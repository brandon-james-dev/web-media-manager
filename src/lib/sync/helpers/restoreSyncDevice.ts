import type { SyncDeviceRecord, SyncDevice } from "@/models";
import { DeviceScanner } from "../DeviceScanner";

export async function restoreSyncDevice(
  record: SyncDeviceRecord
): Promise<SyncDevice | null> {
  if (!record.rootHandle) return null;

  const permission = await record.rootHandle.requestPermission({
    mode: "readwrite",
  });

  if (permission !== "granted") {
    return null;
  }

  const scanner = new DeviceScanner();

  return scanner.scan(record.usb, record.rootHandle);
}
