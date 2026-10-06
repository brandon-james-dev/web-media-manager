import type { UsbDeviceInfo } from "./UsbDeviceInfo";

export function mapUsbDevice(device: USBDevice): UsbDeviceInfo {
  return {
    vendorId: device.vendorId,
    productId: device.productId,

    manufacturerName: device.manufacturerName,
    productName: device.productName,
    serialNumber: device.serialNumber,
  };
}
