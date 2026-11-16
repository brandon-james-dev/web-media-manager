/**
 * The WebUSB filter list every device picker uses.
 *
 * `classCode` matches the device descriptor's `bDeviceClass`. MTP/PTP players
 * often report `0x00` ("class defined at the interface level") or `0xFF`
 * (vendor-specific) there, with the MTP interface class living on the
 * interface instead — so filtering on `0x06` alone hid them from the picker
 * even though they were plugged in. The Zune is one of these.
 *
 * The list therefore covers the interface-level and vendor-specific classes
 * too, plus the vendor ids of the players this app targets. It stays narrow
 * enough to keep hubs, keyboards, audio and HID devices out of the picker.
 */
export interface UsbDeviceFilter {
  vendorId?: number;
  productId?: number;
  classCode?: number;
  subclassCode?: number;
  protocolCode?: number;
  serialNumber?: string;
}

/** Vendor ids of portable players, so a device is offered even if its class lies. */
const PLAYER_VENDOR_IDS = [
  0x045e, // Microsoft (Zune, PlaysForSure)
  0x05ac, // Apple (iPod, iPhone)
  0x0781, // SanDisk
  0x041e, // Creative
  0x0930, // Toshiba
  0x054c, // Sony
  0x1004, // LG
  0x04e8, // Samsung
];

export const USB_DEVICE_FILTERS: UsbDeviceFilter[] = [
  { classCode: 0x06 }, // MTP / PTP at the device level
  { classCode: 0x08 }, // Mass storage at the device level
  { classCode: 0x00 }, // class defined at the interface level (Zune, many MTP players)
  { classCode: 0xff }, // vendor-specific
  ...PLAYER_VENDOR_IDS.map((vendorId) => ({ vendorId })),
];
