import type { SyncDeviceRecord, SyncDevice } from "@/models";
import { DeviceScanner } from "../DeviceScanner";

import type { DeviceReadProgress } from "../detectors/DeviceDetector";

export async function restoreSyncDevice(
  record: SyncDeviceRecord,
  onProgress?: DeviceReadProgress
): Promise<SyncDevice | null> {
  // A Zune has no mountable filesystem: its library is read over MTP, so
  // there is no directory permission to request.
  if (!record.rootHandle) {
    if (record.type !== "zune") return null;

    const scanner = new DeviceScanner();
    const device = await scanner.scan(undefined, record.usb, onProgress);
    return { ...device, id: record.id };
  }

  const permission = await record.rootHandle.requestPermission({
    mode: "readwrite",
  });

  if (permission !== "granted") {
    return null;
  }

  const scanner = new DeviceScanner();

  const device = await scanner.scan(record.rootHandle, record.usb, onProgress);

  // Detectors mint a fresh uuid on every scan. Reuse the persisted id so a
  // refresh does not remount the device card (React keyed on device.id),
  // which would reset the selected tab and scroll position mid-interaction.
  return { ...device, id: record.id };
}
