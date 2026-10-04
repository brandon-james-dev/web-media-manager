import type { UsbDeviceInfo } from "../usb/UsbDeviceInfo";

export class DirectoryPickerRequiredError extends Error {
  private _usbInfo: UsbDeviceInfo;
  public get usbInfo(): UsbDeviceInfo {
    return this._usbInfo;
  }

  constructor(usbInfo: UsbDeviceInfo) {
    super("This device requires choosing the storage root directory.");

    this.name = "DirectoryPickerRequiredError";
    this._usbInfo = usbInfo;
  }
}
