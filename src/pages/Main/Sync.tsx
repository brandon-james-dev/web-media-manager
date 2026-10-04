import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { MonitorSmartphone, Plus, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notification$ } from "@/events/notification-events";
import {
  DirectoryPickerRequiredError,
  IPOD_MODELS,
  IpodDetector,
  type UsbDeviceInfo,
} from "@/lib/sync";
import { useSync } from "@/hooks";
import type { SyncDevice } from "@/models";

export function Sync() {
  const { devices, addDevice } = useSync();
  const [pendingUsbDevice, setPendingUsbDevice] = useState<UsbDeviceInfo>();

  async function handleAddDeviceClick() {
    try {
      await addDevice();
    } catch (error) {
      if (error instanceof DirectoryPickerRequiredError) {
        setPendingUsbDevice(error.usbInfo);

        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      notification$.next({
        id: uuidv7(),
        title: "Device add error",
        detail: errorMessage,
        kind: "Device add error",
        state: "error",
      });
    }
    if (pendingUsbDevice) {
      setPendingUsbDevice(undefined);
    }
  }

  async function handleSelectPendingDeviceDirectory() {
    try {
      if (!window.showDirectoryPicker)
        throw new Error("The directory picker is not available");
      const rootDirectory = await window.showDirectoryPicker();
      await addDevice(rootDirectory, pendingUsbDevice);
      setPendingUsbDevice(undefined);
    } catch (error) {
      if (error instanceof DirectoryPickerRequiredError) {
        setPendingUsbDevice(error.usbInfo);

        return;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      notification$.next({
        id: uuidv7(),
        title: "Device add error",
        detail: errorMessage,
        kind: "Device add error",
        state: "error",
      });
    }
  }

  async function handleReadDbButtonClicked(device: SyncDevice) {
    if (!device.rootHandle) return;
    await new IpodDetector().detect(device.rootHandle);
  }

  return (
    <div className="p-4 h-full overflow-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Sync Devices</h1>

            <div className="text-muted-foreground">
              Connect and manage portable music devices.
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAddDeviceClick}>
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
          </div>
        </div>

        {pendingUsbDevice && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="font-medium flex gap-2">
                <span>
                  {pendingUsbDevice.manufacturerName === "Apple Inc."
                    ? "iPod Detected"
                    : "Device Detected"}
                </span>
                {pendingUsbDevice.manufacturerName === "Apple Inc." && (
                  <span>({IPOD_MODELS[pendingUsbDevice.productId].name})</span>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {pendingUsbDevice.manufacturerName === "Apple Inc."
                  ? "This iPod uses a mass-storage filesystem. Select the iPod root directory to continue."
                  : "This device requires filesystem access before it can be added."}
              </div>

              {pendingUsbDevice.manufacturerName !== "Apple Inc." && (
                <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-sm">
                  <div className="text-muted-foreground">Vendor</div>

                  <div>{pendingUsbDevice.manufacturerName}</div>

                  <div className="text-muted-foreground">Product</div>

                  <div>{pendingUsbDevice.productId}</div>

                  {pendingUsbDevice.productName && (
                    <>
                      <div className="text-muted-foreground">Device</div>

                      <div>{pendingUsbDevice.productName}</div>
                    </>
                  )}

                  {pendingUsbDevice.serialNumber && (
                    <>
                      <div className="text-muted-foreground">Serial</div>

                      <div className="font-mono text-xs break-all">
                        {pendingUsbDevice.serialNumber}
                      </div>
                    </>
                  )}
                </div>
              )}

              {pendingUsbDevice.manufacturerName === "Apple Inc." && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">
                        iPod Filesystem Access Required
                      </div>

                      <div className="text-muted-foreground mt-1">
                        Select the device root directory
                      </div>
                    </div>
                    <div>
                      <Button onClick={handleSelectPendingDeviceDirectory}>
                        Select iPod root Directory
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {devices.length === 0 && (
          <Card>
            <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
              <MonitorSmartphone className="h-10 w-10 text-muted-foreground" />

              <div className="font-medium">No devices configured</div>

              <div className="text-sm text-muted-foreground">
                Connect an iPod, Zune, or supported device to begin.
              </div>
            </CardContent>
          </Card>
        )}

        {devices.map((device) => (
          <Card key={device.id}>
            <CardContent className="py-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{device.name}</div>

                  <div className="text-sm text-muted-foreground">
                    {device.type} -
                    {Number(
                      (device.storage?.usedBytes ?? 0) / Math.pow(1024, 3)
                    ).toFixed(2)}
                    GB used
                  </div>
                </div>

                <div>
                  <Button
                    size="xs"
                    onClick={async () =>
                      await handleReadDbButtonClicked(device)
                    }
                  >
                    <RefreshCw />
                  </Button>
                  <Badge variant="outline">
                    {device.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              </div>

              <div>
                {(device.model ||
                  device.firmwareVersion ||
                  device.serialNumber) && (
                  <div className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-1 text-sm">
                    {device.model && (
                      <>
                        <div className="text-muted-foreground">Model</div>
                        <div>{device.model}</div>
                      </>
                    )}

                    {device.firmwareVersion && (
                      <>
                        <div className="text-muted-foreground">Firmware</div>
                        <div>{device.firmwareVersion}</div>
                      </>
                    )}

                    {device.serialNumber && (
                      <>
                        <div className="text-muted-foreground">Serial</div>
                        <div>{device.serialNumber}</div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {device.capabilities.database && (
                    <Badge variant="secondary">Database</Badge>
                  )}

                  {device.capabilities.artwork && (
                    <Badge variant="secondary">Artwork</Badge>
                  )}

                  {device.capabilities.playlists && (
                    <Badge variant="secondary">Playlists</Badge>
                  )}

                  {device.capabilities.playbackStats && (
                    <Badge variant="secondary">Playback Stats</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
