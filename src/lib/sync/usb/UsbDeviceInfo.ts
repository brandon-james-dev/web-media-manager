export interface UsbDeviceInfo {
  vendorId: number;
  productId: number;

  manufacturerName: string | null;
  productName: string | null;
  serialNumber: string | null;
}
