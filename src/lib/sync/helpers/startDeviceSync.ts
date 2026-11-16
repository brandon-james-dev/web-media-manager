import type { SyncDevice } from "@/models";

export interface StartDeviceSyncDeps {
  findDevice: (deviceId: string) => SyncDevice | undefined;
  syncQueue: (device: SyncDevice) => Promise<void>;
  onStarted: (device: SyncDevice) => void;
  onMissingDevice: (deviceId: string) => void;
  onFailed: (deviceId: string, error: unknown) => void;
}

/**
 * Start a device sync and report every way it can fail to start.
 *
 * The command handler used to `return` when the device was not in the list and
 * to `void syncQueue(device).then(...)` with no `catch`. Both are silent: the
 * syncing flag never rose, no notification appeared, and the only trace was an
 * unhandled rejection in the console. A sync that cannot start must say so.
 */
export function startDeviceSync(
  deviceId: string,
  deps: StartDeviceSyncDeps
): void {
  const device = deps.findDevice(deviceId);
  if (!device) {
    deps.onMissingDevice(deviceId);
    return;
  }

  void deps
    .syncQueue(device)
    .then(() => deps.onStarted(device))
    .catch((error) => deps.onFailed(deviceId, error));
}
