import { useState } from "react";
import { uuidv7 } from "uuidv7";
import { MonitorSmartphone, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";
import {
  SidebarDropRow,
  sidebarSyncDropId,
} from "@/components/library-sidebar";
import { notification$ } from "@/events/notification-events";
import { AddDeviceDialog, SyncDeviceCard, SyncQueue } from "@/components/sync";
import { useSync } from "@/hooks";
import { DevicePromptOrchestrator } from "@/lib/sync";
import { usbAvailable } from "@/lib/sync/usbAvailable";

export function Sync({ compact = false }: { compact?: boolean } = {}) {
  //#region State
  const { devices, addDevice, refreshDevices } = useSync();
  const usbSupported = usbAvailable();
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] =
    useState<boolean>(false);
  // The dialog is shown twice for a mass-storage device (e.g. an iPod):
  // first the USB picker (one user gesture), then the folder picker (a
  // second, separate gesture) — both pickers require their own transient
  // user activation and cannot be chained in a single handler.
  const [isFolderPromptOpen, setIsFolderPromptOpen] = useState(false);
  const [orchestrator] = useState(
    () => new DevicePromptOrchestrator(addDevice)
  );
  //#endregion

  //#region Interactivity handlers
  // Gesture 1: USB picker (from the "USB Device" card click).
  async function handleUsbSelectedClick() {
    try {
      const usbInfo = await orchestrator.requestUsb();
      if (!usbInfo) return; // cancelled
      // Mass-storage devices (iPod) also need a directory picker — which
      // must be its own gesture, so show the folder prompt now.
      if (orchestrator.needsRoot) {
        setIsFolderPromptOpen(true);
        return;
      }
      await handleComplete();
    } catch (error) {
      handleError(error);
    }
  }

  // Gesture 2: directory picker (from the "Folder"/"Select iPod folder"
  // card click) — a separate click so the transient activation is still
  // valid for showDirectoryPicker.
  async function handleFolderSelectedClick() {
    setIsFolderPromptOpen(false);
    try {
      const root = await orchestrator.requestRoot();
      if (!root) return; // cancelled
      await handleComplete();
    } catch (error) {
      handleError(error);
    }
  }

  // No pickers: scan + persist with whatever was collected.
  async function handleComplete(): Promise<void> {
    try {
      const result = await orchestrator.complete();
      if (result) {
        notification$.next({
          id: uuidv7(),
          title: "Device added",
          detail: `${result.name} connected`,
          kind: "Device added",
          state: "completed",
        });
      }
    } catch (error) {
      handleError(error);
    }
  }

  async function handleRefreshButtonClicked(): Promise<void> {
    await refreshDevices();
  }

  function handleError(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    notification$.next({
      id: uuidv7(),
      title: "Device add error",
      detail: errorMessage,
      kind: "Device add error",
      state: "error",
    });
  }
  //#endregion

  return (
    <div className={cn("h-full overflow-auto", compact ? "p-1" : "p-4")}>
      <div className={cn("mx-auto space-y-4", !compact && "max-w-4xl")}>
        {compact ? (
          // Sidebar: the devices as droppable rows, nothing else. The page
          // chrome (title, add/refresh) belongs to the full view.
          <div className="space-y-1">
            {devices.map((device) => (
              <SidebarDropRow
                key={device.id}
                id={sidebarSyncDropId(device.id)}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    device.connected ? "bg-primary" : "bg-muted-foreground/40"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{device.name}</span>
                {!device.connected && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    offline
                  </span>
                )}
              </SidebarDropRow>
            ))}

            {devices.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground">
                No sync devices
              </div>
            )}
          </div>
        ) : (
          <>
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
              disabled={!usbSupported}
              title={
                usbSupported
                  ? undefined
                  : "WebUSB is not supported in this browser"
              }
            >
              <Plus className="h-4 w-4" />
              Add Device
            </Button>
            <Button
              onClick={handleRefreshButtonClicked}
              disabled={!usbSupported}
              title={
                usbSupported
                  ? undefined
                  : "WebUSB is not supported in this browser"
              }
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Device
            </Button>
          </div>
        </div>

        <AddDeviceDialog
          open={isAddDeviceDialogOpen}
          onOpenChange={setIsAddDeviceDialogOpen}
          onFolderSelected={() => handleFolderSelectedClick()}
          onUsbSelected={() => handleUsbSelectedClick()}
        />

        {/* Second gesture for mass-storage devices: pick the iPod folder. */}
        <AddDeviceDialog
          folderOnly
          open={isFolderPromptOpen}
          onOpenChange={setIsFolderPromptOpen}
          onFolderSelected={() => handleFolderSelectedClick()}
        />

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
          </>
        )}
      </div>
    </div>
  );
}
