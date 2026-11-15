import { useEffect, useMemo, useState } from "react";
import { ListChecks, RotateCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/sync/helpers/formatBytes";
import { wmmBus } from "@/events";
import { cn } from "cn";
import type { SyncTrack } from "@/models";

interface SidebarSyncedTracksProps {
  deviceId: string;
  tracks: SyncTrack[];
}

/**
 * The tracks already on the device, sized for the sidebar.
 *
 * Mirrors the queue and the playlist detail: rows select on click, and the
 * header offers select-all / clear / remove-selected. Removing deletes the
 * files from the device, so it goes through `wmm.sync.removeTracks` rather
 * than touching the queue.
 */
export function SidebarSyncedTracks({
  deviceId,
  tracks,
}: SidebarSyncedTracksProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Total size of what is on the device, shown beside the count so the panel
  // says how much space the library occupies without opening the card.
  const totalBytes = useMemo(
    () => tracks.reduce((sum, track) => sum + (track.fileSize ?? 0), 0),
    [tracks]
  );

  // A track that leaves the device must not stay selected, or the remove
  // button would count rows that are no longer there.
  useEffect(() => {
    const present = new Set(tracks.map((track) => track.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => present.has(id));
      return next.length === current.length ? current : next;
    });
  }, [tracks]);

  function toggleSelected(trackId: number): void {
    setSelectedIds((current) =>
      current.includes(trackId)
        ? current.filter((id) => id !== trackId)
        : [...current, trackId]
    );
  }

  function removeSelected(): void {
    if (selectedIds.length === 0) {
      return;
    }
    const removing = selectedIds;
    setSelectedIds([]);
    wmmBus.invoke("wmm.sync.removeTracks", {
      deviceId,
      trackIds: removing,
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 min-w-0 flex-1 justify-start gap-1 px-1.5 text-xs"
          title="Re-read the device's contents"
          aria-label="Refresh device contents"
          onClick={() => wmmBus.invoke("wmm.sync.refreshDevices")}
        >
          <RotateCw />
          Refresh device contents
        </Button>
        {tracks.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title="Select all"
            aria-label="Select all synced tracks"
            onClick={() => setSelectedIds(tracks.map((track) => track.id))}
          >
            <ListChecks />
          </Button>
        )}
        {selectedIds.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title="Clear selection"
            aria-label="Clear selection"
            onClick={() => setSelectedIds([])}
          >
            <X />
          </Button>
        )}
        {selectedIds.length > 0 ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-6 shrink-0 gap-1 px-2 text-xs"
            title={`Remove ${selectedIds.length} selected from the device`}
            aria-label={`Remove ${selectedIds.length} selected tracks from the device`}
            onClick={removeSelected}
          >
            <Trash2 />
            {selectedIds.length}
          </Button>
        ) : (
          <span
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
            title={`${tracks.length} track${tracks.length === 1 ? "" : "s"}, ${formatBytes(totalBytes)}`}
          >
            {tracks.length} · {formatBytes(totalBytes)}
          </span>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="py-1">
          {tracks.map((track) => {
            const selected = selectedIds.includes(track.id);

            return (
              <button
                key={track.id}
                type="button"
                onClick={() => toggleSelected(track.id)}
                className={cn(
                  "flex w-full min-w-0 items-baseline gap-2 px-2 py-1.5 text-left text-sm",
                  "odd:bg-muted/15 hover:bg-accent/10",
                  selected && "bg-primary/15 hover:bg-primary/20"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{track.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatBytes(track.fileSize ?? 0)}
                </span>
              </button>
            );
          })}

          {tracks.length === 0 && (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Nothing synced yet
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
