import type { SyncDevice } from "@/models";

/**
 * Mark the device with this serial as disconnected, leaving the others alone.
 *
 * The `disconnect` handler used to drop the device from state entirely
 * (`setDevices(devices.filter(...))`), so `SyncDevice.connected` was never
 * turned off and the "offline" state the device row renders was unreachable.
 * Keeping the row and clearing the flag is what lets the UI show a device that
 * is still configured but no longer plugged in.
 */
export function markDeviceDisconnected(
  devices: SyncDevice[],
  serialNumber: string | undefined
): SyncDevice[] {
  if (!serialNumber) return devices;

  return devices.map((device) =>
    device.usb?.serialNumber === serialNumber
      ? { ...device, connected: false }
      : device
  );
}

/**
 * Whether any device is plugged in right now.
 *
 * The Sync page used `devices.length > 0` to hide "Add Device". Because a
 * disconnected device keeps its row (so the UI can show it as offline), that
 * count stayed above zero after an unplug and the add button never came back —
 * adding a device only worked once the row was gone. Visibility keys on
 * `connected` instead.
 */
export function hasConnectedDevice(devices: SyncDevice[]): boolean {
  return devices.some((device) => device.connected);
}
