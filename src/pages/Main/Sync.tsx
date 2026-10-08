import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { MonitorSmartphone, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notification$ } from "@/events/notification-events";
import { AddDeviceDialog, SyncDeviceCard, SyncQueue } from "@/components/sync";
import { useSync } from "@/hooks";
import { DirectoryPickerRequiredError, type UsbDeviceInfo } from "@/lib/sync";

export function Sync() {
  //#region State
  const { devices, addDevice, refreshDevices } = useSync();
  const [pendingUsbDevice, setPendingUsbDevice] = useState<UsbDeviceInfo>();
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] =
    useState<boolean>(false);
  //#endregion

  //#region Interactivity handlers
  async function handleDeviceSelectionClick(isUsb: boolean) {
    try {
      if (isUsb) {
        await addDevice();
      } else {
        const root = await window?.showDirectoryPicker?.();
        if (!root) throw new Error("The directory picker is unavailable");
        await addDevice(undefined, root);
      }
    } catch (error) {
      if ((error as Error).name == "NotFoundError") {
        return;
      }

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
      await addDevice(pendingUsbDevice, rootDirectory);
      setPendingUsbDevice(undefined);
    } catch (error) {
      if ((error as Error).name == "AbortError") {
        return;
      }
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

  async function handleRefreshButtonClicked(): Promise<void> {
    await refreshDevices();
  }
  //#endregion

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
            <Button
              onClick={() => setIsAddDeviceDialogOpen(true)}
              hidden={devices.length > 0}
            >
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
            <Button onClick={handleRefreshButtonClicked}>
              <RefreshCw className="h-4 w-4" />
              Refresh Device
            </Button>
          </div>
        </div>

        <AddDeviceDialog
          open={isAddDeviceDialogOpen}
          onOpenChange={setIsAddDeviceDialogOpen}
          onFolderSelected={() => handleDeviceSelectionClick(false)}
          onUsbSelected={() => handleDeviceSelectionClick(true)}
        />

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
                  <span>({pendingUsbDevice.productId ?? "Unknown iPod"})</span>
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
          <div key={device.id} className="flex flex-col gap-3">
            <SyncDeviceCard device={device} />
            <SyncQueue syncDevice={device} />
          </div>
        ))}
      </div>
    </div>
  );
}
