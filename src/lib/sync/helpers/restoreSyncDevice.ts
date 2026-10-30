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

  const device = await scanner.scan(record.rootHandle, record.usb);

  // Detectors mint a fresh uuid on every scan. Reuse the persisted id so a
  // refresh does not remount the device card (React keyed on device.id),
  // which would reset the selected tab and scroll position mid-interaction.
  return { ...device, id: record.id };
}
