import { useMemo } from "react";
import { useSync } from "@/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/sync/helpers";
import { TanstackSongTable } from "../song-table";
import type { SyncDevice } from "@/models";

export function SyncQueue({ syncDevice }: { syncDevice: SyncDevice }) {
  const { queuedSongs, syncQueue, isSyncing } = useSync();
  const queueSizeBytes = useMemo(
    () => queuedSongs.reduce((total, song) => total + (song.filesize ?? 0), 0),
    [queuedSongs]
  );

  function handleSyncButtonClick(syncDevice: SyncDevice) {
    void syncQueue(syncDevice);
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
          </div>

          <Button
            disabled={isSyncing || !syncDevice || queuedSongs.length === 0}
            onClick={() => handleSyncButtonClick(syncDevice)}
          >
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
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
    </Card>
  );
}
