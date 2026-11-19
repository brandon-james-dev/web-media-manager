import { useMemo, useState } from "react";
import { cn } from "cn";
import { Check, Trash2 } from "lucide-react";
import { TrackItem } from "@/components/track-item";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemGroup } from "@/components/ui/item";
import { attrBool } from "@/core/themes";
import { wmmBus } from "@/events";
import { useSync, useSyncUiVisible } from "@/hooks";
import { useTranslation } from "@/i18n";
import { formatBytes } from "@/lib/sync/helpers";
import type { ElementProps } from "@/lib/themes/render/browser";
import { useThemeTextClass } from "../../shared/themeText";
import { WidgetFrame } from "../../shared/WidgetFrame";
import { useLibrarySelection } from "../shared/librarySelection";

/**
 * The songs queued for device sync, narrowed by the page's sync query. Each
 * row can be taken out of the queue, and `summary` adds the count and size
 * totals above the list with the clear action. While a sync runs a progress
 * readout replaces the summary and cancels the run when activated, the queue
 * takes no edits, and a synced row shows a tick in place of its size.
 *
 * @example
 * ```xml
 * <SyncQueue summary="true" panel="@panel/inset" rowText="@text/body" />
 * <SyncQueue rowText="@text/glass-title" />
 * ```
 * @example
 * ```tsx
 * <RenderNode node={syncQueue} />
 * ```
 */
export function ThemeSyncQueue({ node, style }: ElementProps) {
  const { t } = useTranslation();
  const {
    queuedSongs,
    isSyncing,
    syncProgress,
    cancelSync,
    syncedSongIds,
    syncCompleted,
  } = useSync();
  useSyncUiVisible();
  const { state } = useLibrarySelection();
  const rowClass = useThemeTextClass(node, "rowText");
  const [clearOpen, setClearOpen] = useState(false);

  const showSummary = attrBool(node, "summary") ?? false;

  const synced = useMemo(() => new Set(syncedSongIds), [syncedSongIds]);

  const visible = useMemo(() => {
    const query = state.syncQuery.trim().toLowerCase();
    if (query === "") return queuedSongs;
    return queuedSongs.filter((song) =>
      [song.title, song.album, song.artist, song.genre].some(
        (field) => field !== undefined && field.toLowerCase().includes(query)
      )
    );
  }, [queuedSongs, state.syncQuery]);

  const totalBytes = useMemo(
    () => visible.reduce((sum, song) => sum + (song.filesize ?? 0), 0),
    [visible]
  );

  return (
    <WidgetFrame node={node} style={style}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        {isSyncing && syncProgress ? (
          <button
            type="button"
            className="flex h-6 min-w-0 shrink-0 cursor-default select-none flex-col justify-center gap-0.5 rounded-md px-1.5 text-left hover:bg-accent/15"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={syncProgress.total}
            aria-valuenow={syncProgress.completed}
            aria-label={t("sync.progressCancel")}
            title={t("sync.cancel")}
            onClick={cancelSync}
          >
            <div className="flex items-baseline justify-between gap-1 text-xs">
              <span className="truncate">{t("sync.syncing")}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {syncProgress.completed}/{syncProgress.total}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${
                    syncProgress.total === 0
                      ? 0
                      : (syncProgress.completed / syncProgress.total) * 100
                  }%`,
                }}
              />
            </div>
          </button>
        ) : syncCompleted ? (
          <span className="flex shrink-0 items-center gap-1 text-xs">
            <Check className="size-3.5" />
            {t("sync.completed")}
          </span>
        ) : null}
        {showSummary ? (
          <div className="flex shrink-0 items-center justify-between gap-1">
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("sync.trackCount", [visible.length, formatBytes(totalBytes)])}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0 cursor-default"
              title={t("sync.clearQueueHint")}
              aria-label={t("sync.clearQueueLabel")}
              disabled={queuedSongs.length === 0 || isSyncing}
              onClick={() => setClearOpen(true)}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        ) : null}
        {visible.length === 0 ? (
          <span className="flex min-h-0 min-w-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            {t("sync.dropToQueue")}
          </span>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
            <ItemGroup className="gap-0! has-data-[size=sm]:gap-0! has-data-[size=xs]:gap-0!">
              {visible.map((song, index) => (
                <TrackItem
                  key={song.id}
                  song={song}
                  index={index}
                  size="sm"
                  hideNumber
                  availableActions={[]}
                  alwaysShowActions
                  trailing={
                    synced.has(song.id) ? (
                      <Check
                        role="img"
                        aria-label={t("sync.syncedToDevice")}
                        className="size-3.5 text-primary"
                      />
                    ) : (
                      <span className="tabular-nums text-muted-foreground">
                        {formatBytes(song.filesize)}
                      </span>
                    )
                  }
                  actions={
                    isSyncing
                      ? []
                      : [
                          {
                            label: t("sync.removeFromQueue"),
                            destructive: true,
                            onSelect: () =>
                              wmmBus.invoke("wmm.sync.dequeueSongs", {
                                songIds: [song.id],
                              }),
                          },
                        ]
                  }
                  className={cn(rowClass, "min-h-7")}
                />
              ))}
            </ItemGroup>
          </div>
        )}
      </div>
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sync.clearQueueTitle")}</DialogTitle>
            <DialogDescription>
              {t("sync.clearQueueDescription", [queuedSongs.length])}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                wmmBus.invoke("wmm.sync.clearQueue");
                setClearOpen(false);
              }}
            >
              {t("sync.clearQueueAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WidgetFrame>
  );
}
