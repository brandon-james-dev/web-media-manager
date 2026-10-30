import type { SyncDevice } from "@/models";
import type { UsbDeviceInfo } from "./usb/UsbDeviceInfo";
import { SyncService } from "./SyncService";
import { mapUsbDevice } from "./usb";

export type AddDeviceFn = (
  usbDevice?: UsbDeviceInfo,
  rootDirectory?: FileSystemDirectoryHandle
) => Promise<SyncDevice>;

/**
 * Wraps the browser prompt APIs (`navigator.usb.requestDevice` and
 * `window.showDirectoryPicker`) so that a device can be added without
 * re-prompting.
 *
 * Both pickers require transient user activation, and activation is consumed
 * by the first picker — so each prompt must be triggered by its own user
 * gesture (a button click). This orchestrator therefore exposes one method
 * per picker (`requestUsb`, `requestRoot`), plus `complete()` which performs
 * the actual device scan with whatever was collected. `Sync.tsx` drives the
 * steps: click "USB Device" -> USB picker; if the device needs filesystem
 * access (iPod), click "Select iPod folder" -> directory picker; then the
 * device is added once.
 */
export class DevicePromptOrchestrator {
  private readonly addDevice: AddDeviceFn;
  private readonly syncService: SyncService;
  private pendingUsb: UsbDeviceInfo | undefined;
  private pendingRoot: FileSystemDirectoryHandle | undefined;

  constructor(addDevice: AddDeviceFn, syncService?: SyncService) {
    this.addDevice = addDevice;
    this.syncService = syncService ?? new SyncService();
  }

  /**
   * Phase 1 — the USB picker ONLY. Must be called directly from a user
   * gesture. `priorUsb` may carry a device already selected earlier (e.g. a
   * refresh); when the user never chose a USB device, the USB picker is
   * requested here.
   *
   * @returns the selected USB info, or `undefined` when the user cancelled.
   */
  async requestUsb(priorUsb?: UsbDeviceInfo): Promise<UsbDeviceInfo | undefined> {
    let usbInfo = priorUsb;
    if (!usbInfo) {
      try {
        const usbDevice = await navigator.usb.requestDevice({
          filters: [
            { classCode: 0x06 }, // MTP/PTP
            { classCode: 0x08 }, // Mass Storage
          ],
        });
        usbInfo = mapUsbDevice(usbDevice);
      } catch {
        // User cancelled the USB picker; abort the whole add.
        return undefined;
      }
    }
    this.pendingUsb = usbInfo;
    return usbInfo;
  }

  /** Whether the pending USB device needs a directory picker (e.g. iPod). */
  get needsRoot(): boolean {
    return this.pendingUsb
      ? this.syncService.requiresRootDirectory(this.pendingUsb)
      : true;
  }

  /**
   * Phase 2 — the directory picker ONLY. Must be called directly from a
   * (separate) user gesture: the transient user activation is consumed by
   * the first picker, so this can't be chained after `requestUsb` in the
   * same click handler.
   *
   * @returns the selected folder, or `undefined` when the user cancelled.
   */
  async requestRoot(): Promise<FileSystemDirectoryHandle | undefined> {
    try {
      if (!window.showDirectoryPicker) {
        throw new Error("The directory picker is not available");
      }
      this.pendingRoot = await window.showDirectoryPicker();
      return this.pendingRoot;
    } catch {
      // User cancelled the directory picker; abort the whole add.
      this.pendingUsb = undefined;
      return undefined;
    }
  }

  /**
   * Phase 3 — no prompts: scans and persists the device using whatever was
   * collected in the previous phases. Safe to call without a gesture.
   *
   * @returns the added device, or `undefined` when a required input is missing.
   */
  async complete(): Promise<SyncDevice | undefined> {
    if (!this.pendingRoot && this.needsRoot) return undefined;
    try {
      const device = await this.addDevice(this.pendingUsb, this.pendingRoot);
      this.reset();
      return device;
    } catch (error) {
      if ((error as Error).name === "NotFoundError") {
        this.reset();
        return undefined;
      }
      throw error;
    }
  }

  /** Forget any remembered pending input (e.g. when the modal was closed). */
  reset() {
    this.pendingUsb = undefined;
    this.pendingRoot = undefined;
  }
}
