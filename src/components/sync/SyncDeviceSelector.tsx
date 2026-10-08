import { FolderOpen, Usb } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Card, CardContent } from "@/components/ui/card";

export interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;

  onUsbSelected?(): Promise<void> | void;
  onFolderSelected?(): Promise<void> | void;
}

export function AddDeviceDialog({
  open,
  onOpenChange,
  onUsbSelected,
  onFolderSelected,
}: AddDeviceDialogProps) {
  const handleUsbClick = async () => {
    onOpenChange(false);
    await onUsbSelected?.();
  };

  const handleFolderClick = async () => {
    onOpenChange(false);
    await onFolderSelected?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add Device</DialogTitle>

          <DialogDescription>
            Choose how your device is connected.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <Card
            className="cursor-pointer transition-colors hover:bg-muted"
            onClick={handleUsbClick}
          >
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <Usb className="text-primary h-16 w-16" />

              <div>
                <h3 className="font-semibold">USB Device</h3>

                <p className="text-muted-foreground text-sm">
                  Detect devices using WebUSB or native USB protocols.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:bg-muted"
            onClick={handleFolderClick}
          >
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <FolderOpen className="text-primary h-16 w-16" />

              <div>
                <h3 className="font-semibold">Folder</h3>

                <p className="text-muted-foreground text-sm">
                  Select a mounted device, SD card, external drive, or media
                  folder.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
