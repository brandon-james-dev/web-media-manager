import { useState } from "react";
import { SyncService } from "@/lib/sync";
import type { SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "@/lib/sync/usb/UsbDeviceInfo";

const syncService = new SyncService();

export function useSync() {
  const [devices, setDevices] = useState<SyncDevice[]>([]);

  async function addDevice(
    rootDirectory?: FileSystemDirectoryHandle,
    usbDevice?: UsbDeviceInfo
  ) {
    const device = await syncService.addDevice(rootDirectory, usbDevice);

    setDevices((prev) => [...prev, device]);

    return device;
  }

  function removeDevice(id: string) {
    setDevices((prev) => prev.filter((device) => device.id !== id));
  }

  return {
    devices,
    addDevice,
    removeDevice,
  };
}
