/**
 * Whether the WebUSB API is available in this browser.
 *
 * WebUSB (`navigator.usb`) is Chromium-only: it is absent in Safari on all
 * platforms and in Firefox. Device sync (scanning, connecting, refreshing a
 * portable music device) depends on it, so UI for those actions should be
 * disabled when this returns false.
 */
export function usbAvailable(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}
