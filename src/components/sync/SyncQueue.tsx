import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { useSync, useSyncUiVisible } from "@/hooks";
import { wmmBus } from "@/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/sync/helpers";
import { TanstackSongTable } from "../song-table";
import type { SyncDevice } from "@/models";

export function SyncQueue({ syncDevice }: { syncDevice: SyncDevice }) {
  const {
    queuedSongs,
    isSyncing,
    syncProgress,
    cancelSync,
    syncedSongIds,
    syncCompleted,
  } = useSync();
  useSyncUiVisible();
  const [clearOpen, setClearOpen] = useState(false);
  const queueSizeBytes = useMemo(
    () => queuedSongs.reduce((total, song) => total + (song.filesize ?? 0), 0),
    [queuedSongs]
  );

  function handleSyncButtonClick(syncDevice: SyncDevice) {
    wmmBus.invoke("wmm.sync.sync", { deviceId: syncDevice.id });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Queue ({queuedSongs.length})</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Tracks</div>

              <div className="font-medium">{queuedSongs.length}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Queue Size</div>

              <div className="font-medium">{formatBytes(queueSizeBytes)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Device</div>

              <div className="font-medium">{syncDevice?.name ?? "None"}</div>
            </div>

            {syncedSongIds.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Synced</div>

                <div className="flex items-center gap-1 font-medium text-accent">
                  <Check className="h-3.5 w-3.5" />
                  {syncedSongIds.length}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={isSyncing || queuedSongs.length === 0}
              onClick={() => wmmBus.invoke("wmm.sync.clearQueue")}
              title="Clear the queue without syncing"
            >
              <X className="h-4 w-4" />
              Clear Queue
            </Button>

            <Button
              variant="outline"
              disabled={!isSyncing}
              onClick={cancelSync}
              title="Stop the running sync"
            >
              Cancel Sync
            </Button>

            <Button
              disabled={
                isSyncing || !syncDevice || queuedSongs.length === 0
              }
              onClick={() => handleSyncButtonClick(syncDevice)}
            >
              {isSyncing && syncProgress
                ? `Syncing ${syncProgress.completed}/${syncProgress.total}`
                : "Sync"}
            </Button>

            {syncCompleted && (
              <Button
                variant="secondary"
                className="text-accent"
                onClick={() => setClearOpen(true)}
                title="Clear the synced queue"
              >
                <Check className="h-4 w-4" />
                Sync completed
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 min-w-0 overflow-auto max-h-72">
          <TanstackSongTable
            songs={queuedSongs}
            selectedSongIds={[]}
            isEditMultiple={false}
            onSelect={() => {}}
          />
        </ScrollArea>
      </CardContent>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear the synced queue?</DialogTitle>
            <DialogDescription>
              {queuedSongs.length} track
              {queuedSongs.length === 1 ? "" : "s"} have been written to the
              device. Clearing the queue does not remove them from the device.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                wmmBus.invoke("wmm.sync.clearQueue");
                setClearOpen(false);
              }}
            >
              Clear Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
