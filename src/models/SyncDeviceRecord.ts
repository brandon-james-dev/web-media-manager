import type { UsbDeviceInfo } from "@/lib/sync";
import type { SyncDeviceType } from "./SyncDevice";

export interface SyncDeviceRecord {
  id: string;
  name: string;
  createdAt: number;
  productId?: number;
  usb?: UsbDeviceInfo;

  /** FireWire GUID — used by the iTunesDB hash58 checksum (nano 3/4G, classic). */
  firewireGuid?: string;

  /** Serial number (from USB descriptor or SysInfo). */
  serialNumber?: string;

  type: SyncDeviceType;
  rootHandle?: FileSystemDirectoryHandle;
}
