import { useMemo, useState } from "react";
import { ListChecks, RotateCw, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatBytes } from "@/lib/sync/helpers/formatBytes";
import { useTranslation } from "@/i18n";
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
  const [pickedIds, setPickedIds] = useState<number[]>([]);
  const { t } = useTranslation();

  // Total size of what is on the device, shown beside the count so the panel
  // says how much space the library occupies without opening the card.
  const totalBytes = useMemo(
    () => tracks.reduce((sum, track) => sum + (track.fileSize ?? 0), 0),
    [tracks]
  );

  // A track that leaves the device must not stay selected, or the remove
  // button would count rows that are no longer there. Derived during render
  // rather than pruned in an effect, so the count and the rows always agree.
  const presentIds = useMemo(
    () => new Set(tracks.map((track) => track.id)),
    [tracks]
  );
  const selectedIds = useMemo(
    () => pickedIds.filter((id) => presentIds.has(id)),
    [pickedIds, presentIds]
  );

  function toggleSelected(trackId: number): void {
    setPickedIds((current) =>
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
    setPickedIds([]);
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
          title={t("sync.rereadDevice")}
          aria-label={t("sync.refreshDevice")}
          onClick={() => wmmBus.invoke("wmm.sync.refreshDevices")}
        >
          <RotateCw />
          {t("sync.refreshDevice")}
        </Button>
        {tracks.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title={t("common.selectAll")}
            aria-label={t("sync.selectAllSynced")}
            onClick={() => setPickedIds(tracks.map((track) => track.id))}
          >
            <ListChecks />
          </Button>
        )}
        {selectedIds.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title={t("common.clearSelection")}
            aria-label={t("common.clearSelection")}
            onClick={() => setPickedIds([])}
          >
            <X />
          </Button>
        )}
        {selectedIds.length > 0 ? (
          <Button
            size="sm"
            variant="destructive"
            className="h-6 shrink-0 gap-1 px-2 text-xs"
            title={t("sync.removeSelectedFromDevice", [selectedIds.length])}
            aria-label={t("sync.removeSelectedTracksFromDevice", [
              selectedIds.length,
            ])}
            onClick={removeSelected}
          >
            <Trash2 />
            {selectedIds.length}
          </Button>
        ) : (
          <span
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
            title={t("sync.trackCount", [
              tracks.length,
              formatBytes(totalBytes),
            ])}
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
              {t("sync.nothingSynced")}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
