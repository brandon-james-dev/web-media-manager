import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { uuidv7 } from "uuidv7";
import { AddDeviceDialog } from "./SyncDeviceSelector";
import { commandDispatcher } from "@/events";
import { notification$ } from "@/events/notification-events";
import { useSync } from "@/hooks";
import { useTranslation } from "@/i18n";
import { DevicePromptOrchestrator } from "@/lib/sync";

interface AddDeviceContextValue {
  openAddDevice(): void;
}

const AddDeviceContext = createContext<AddDeviceContextValue | undefined>(
  undefined
);

/**
 * Opens the add-device flow from anywhere inside the provider, including the
 * `wmm.sync.addDevice` command and the themed device panel.
 *
 * @example
 * ```tsx
 * const { openAddDevice } = useAddDevice();
 * ```
 */
export function useAddDevice(): AddDeviceContextValue {
  const context = useContext(AddDeviceContext);

  if (!context) {
    throw new Error("useAddDevice must be used within AddDeviceProvider");
  }

  return context;
}

/**
 * Hosts the add-device flow above both the built-in routes and a themed
 * layout: the USB picker, the folder prompt a mass-storage device needs as a
 * second gesture, and the notifications for both. Mounted once, so the
 * `wmm.sync.addDevice` command has a single handler.
 *
 * @example
 * ```tsx
 * <AddDeviceProvider>
 *   <Routes> ... </Routes>
 * </AddDeviceProvider>
 * ```
 */
export function AddDeviceProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { addDevice } = useSync();
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false);
  const [isFolderPromptOpen, setIsFolderPromptOpen] = useState(false);
  const [orchestrator] = useState(
    () => new DevicePromptOrchestrator(addDevice)
  );

  useEffect(() => {
    return commandDispatcher.register("wmm.sync.addDevice", () => {
      setIsAddDeviceDialogOpen(true);
    });
  }, []);

  async function handleUsbSelectedClick(): Promise<void> {
    try {
      const usbInfo = await orchestrator.requestUsb();
      if (!usbInfo) return;
      if (orchestrator.needsRoot) {
        setIsFolderPromptOpen(true);
        return;
      }
      await handleComplete();
    } catch (error) {
      handleError(error);
    }
  }

  async function handleFolderSelectedClick(): Promise<void> {
    setIsFolderPromptOpen(false);
    try {
      const root = await orchestrator.requestRoot();
      if (!root) return;
      await handleComplete();
    } catch (error) {
      handleError(error);
    }
  }

  async function handleComplete(): Promise<void> {
    try {
      const result = await orchestrator.complete();
      if (result) {
        notification$.next({
          id: uuidv7(),
          title: t("notification.deviceAdded"),
          detail: t("notification.deviceAddedDetail", [result.name]),
          kind: "Device added",
          state: "completed",
        });
      }
    } catch (error) {
      handleError(error);
    }
  }

  function handleError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);

    notification$.next({
      id: uuidv7(),
      title: t("notification.deviceAddError"),
      detail: errorMessage,
      kind: "Device add error",
      state: "error",
    });
  }

  return (
    <AddDeviceContext.Provider
      value={{ openAddDevice: () => setIsAddDeviceDialogOpen(true) }}
    >
      {children}
      <AddDeviceDialog
        open={isAddDeviceDialogOpen}
        onOpenChange={setIsAddDeviceDialogOpen}
        onFolderSelected={() => handleFolderSelectedClick()}
        onUsbSelected={() => handleUsbSelectedClick()}
      />
      <AddDeviceDialog
        folderOnly
        open={isFolderPromptOpen}
        onOpenChange={setIsFolderPromptOpen}
        onFolderSelected={() => handleFolderSelectedClick()}
      />
    </AddDeviceContext.Provider>
  );
}
