export interface UsbDeviceInfo {
  vendorId: number;
  productId: number;
  firmwareVersion?: string;

  manufacturerName: string | undefined;
  productName: string | undefined;
  serialNumber: string | undefined;
}
