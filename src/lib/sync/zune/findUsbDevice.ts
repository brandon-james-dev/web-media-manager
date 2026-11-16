import type { UsbDeviceInfo } from "../usb/UsbDeviceInfo";

/**
 * The `USBDevice` for a device the user has already granted this origin.
 *
 * `getDevices()` returns every device the user has permitted, which is where
 * the device chosen in the USB prompt shows up. The picker itself is not
 * called here: it needs a user gesture, and the caller already made that
 * choice.
 */
export async function findUsbDevice(
  usb: UsbDeviceInfo
): Promise<USBDevice | undefined> {
  if (!("usb" in navigator)) return undefined;

  const devices = await navigator.usb.getDevices();
  const sameModel = devices.filter(
    (device) =>
      device.vendorId === usb.vendorId && device.productId === usb.productId
  );

  // A product id covers a whole family — 0x0710 is every classic Zune — so
  // two players of the same model can be granted at once. The serial is what
  // tells them apart; the model alone is only a fallback for a device whose
  // serial the browser does not expose.
  if (usb.serialNumber) {
    const exact = sameModel.find(
      (device) => device.serialNumber === usb.serialNumber
    );
    if (exact) return exact;
  }

  return sameModel[0];
}
