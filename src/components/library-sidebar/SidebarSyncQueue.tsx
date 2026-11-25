import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownToLine, Check, ListChecks, Trash2, X } from "lucide-react";
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
import { TrackItem } from "@/components/track-item";
import { SidebarDropZone } from "./SidebarDropZone";
import { sidebarSyncDropId, songIdsFromDrag } from "./sidebarDrop";
import { formatBytes } from "@/lib/format";
import { useOfflineSongs, usePlayback, useSync, useSyncUiVisible } from "@/hooks";
import { useDndContext } from "@dnd-kit/core";
import { useTranslation } from "@/i18n";
import { wmmBus } from "@/events";
import { cn } from "cn";
import type { Song } from "@/models";

interface SidebarSyncQueueProps {
  /** The device the queue will be written to; also the drop target id. */
  deviceId: string;
  songs: Song[];
  /**
   * Show the empty-state drop hint. Only meaningful in the sidebar, where the
   * queue is the drop target; the sync page has its own search to add songs.
   */
  showDropHint?: boolean;
  /**
   * Viewport rect of the device panel a synced track should fly to. Omitted in
   * the sidebar, where the chip flies across the queue instead.
   */
  flightTarget?: () => DOMRect | null;
  /** Called when a chip lands, so the device panel can splash. */
  onFlightArrive?: (songId: string) => void;
}

/**
 * The sync queue, sized for the sidebar.
 *
 * Mirrors the playlist detail view: rows select on click, the header offers
 * select-all / clear / remove-selected, and the playing track is highlighted.
 * The whole list is the drop target, so a track dragged from the library
 * anywhere over it is queued.
 */
export function SidebarSyncQueue({
  deviceId,
  songs,
  showDropHint = true,
  flightTarget,
  onFlightArrive,
}: SidebarSyncQueueProps) {
  const { nowPlaying } = usePlayback();
  const { t } = useTranslation();
  const { isSyncing, syncProgress, cancelSync, syncedSongIds, syncCompleted } =
    useSync();
  useSyncUiVisible();
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [clearOpen, setClearOpen] = useState(false);

  // Only downloaded audio can be written to a device, so a drag carrying a
  // song that is not cached cannot be dropped here at all: the zone greys out
  // and refuses the drop instead of accepting it and reporting a skip.
  const { active } = useDndContext();
  const { offlineSongIds } = useOfflineSongs();
  const draggedSongIds = songIdsFromDrag(active?.data.current ?? {});
  const dragNotOffline = draggedSongIds.some((id) => !offlineSongIds.has(id));

  const synced = useMemo(() => new Set(syncedSongIds), [syncedSongIds]);

  // Tracks that just landed on the device, animated flying out of the queue
  // toward the device panel. Each chip removes itself when its flight ends.
  const rootRef = useRef<HTMLDivElement>(null);
  const seenSynced = useRef<Set<string>>(new Set());
  const nextFlightKey = useRef(0);
  const [flights, setFlights] = useState<
    {
      key: number;
      songId: string;
      title: string;
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[]
  >([]);

  // Read through refs: the effect keys off the synced ids, and a changing
  // callback identity must not re-run it. Written after render rather than
  // during it, and before the effect that reads them, so they are current by
  // the time a flight is measured.
  const flightTargetRef = useRef(flightTarget);
  const onFlightArriveRef = useRef(onFlightArrive);
  useEffect(() => {
    flightTargetRef.current = flightTarget;
    onFlightArriveRef.current = onFlightArrive;
  });

  useEffect(() => {
    const arrived = syncedSongIds.filter((id) => !seenSynced.current.has(id));
    seenSynced.current = new Set(syncedSongIds);

    if (arrived.length === 0) return;

    const rootRect = rootRef.current?.getBoundingClientRect();
    if (!rootRect) return;

    // Fly to the device card when one is given, otherwise across the queue
    // itself — the sidebar has no device panel to land on.
    const target = flightTargetRef.current?.() ?? null;

    const from = { x: rootRect.left + 8, y: rootRect.bottom - 32 };
    const to = target
      ? {
          x: target.left + target.width / 2,
          y: target.top + target.height / 2,
        }
      : { x: rootRect.right - 80, y: rootRect.bottom - 32 };

    setFlights((current) => [
      ...current,
      ...arrived.map((id) => ({
        key: nextFlightKey.current++,
        songId: id,
        title: songs.find((song) => song.id === id)?.title ?? t("metadata.track"),
        from,
        to,
      })),
    ]);
  }, [syncedSongIds, songs, t]);

  // Total size of the queued tracks, shown beside the count so the panel says
  // how much will be written to the device.
  const totalBytes = useMemo(
    () => songs.reduce((sum, song) => sum + (song.filesize ?? 0), 0),
    [songs]
  );

  // A song that leaves the queue (synced, or removed elsewhere) must not stay
  // selected, or the remove button would count rows that are no longer there.
  // Derived during render rather than pruned in an effect, so the count and the
  // rows can never disagree for a frame.
  const presentIds = useMemo(
    () => new Set(songs.map((song) => song.id)),
    [songs]
  );
  const selectedIds = useMemo(
    () => pickedIds.filter((id) => presentIds.has(id)),
    [pickedIds, presentIds]
  );

  function toggleSelected(songId: string): void {
    setPickedIds((current) =>
      current.includes(songId)
        ? current.filter((id) => id !== songId)
        : [...current, songId]
    );
  }

  function removeSelected(): void {
    if (selectedIds.length === 0) {
      return;
    }
    const removing = selectedIds;
    setPickedIds([]);
    wmmBus.invoke("wmm.sync.dequeueSongs", { songIds: removing });
  }

  return (
    <div ref={rootRef} className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        {isSyncing && syncProgress ? (
          // The sync button's space becomes the progress readout, and the
          // whole block cancels the run: a track bar with the count, so the
          // run needs no separate indicator.
          <button
            type="button"
            className="flex h-6 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-md px-1.5 text-left hover:bg-accent/15"
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
          // The run finished and the queue is kept so its ticks stay visible.
          // Clearing it is the confirmation-gated follow-up.
          <Button
            size="sm"
            variant="ghost"
            className="h-6 min-w-0 flex-1 justify-start gap-1 px-1.5 text-xs text-accent"
            title={t("sync.clearQueueHint")}
            aria-label={t("sync.clearQueueLabel")}
            onClick={() => setClearOpen(true)}
          >
            <Check />
            {t("sync.completed")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 min-w-0 flex-1 justify-start gap-1 px-1.5 text-xs"
            title={
              songs.length === 0
                ? t("sync.emptyQueueHint")
                : t("sync.syncQueued", [songs.length])
            }
            aria-label={t("sync.syncQueueToDevice")}
            disabled={songs.length === 0 || isSyncing}
            onClick={() => wmmBus.invoke("wmm.sync.sync", { deviceId })}
          >
            <ArrowDownToLine />
            {t("sync.title")}
          </Button>
        )}
        {songs.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title={t("common.selectAll")}
            aria-label={t("sync.selectAllQueued")}
            onClick={() => setPickedIds(songs.map((song) => song.id))}
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
            title={t("sync.removeSelectedCount", [selectedIds.length])}
            aria-label={t("sync.removeSelectedTracks", [selectedIds.length])}
            onClick={removeSelected}
          >
            <Trash2 />
            {selectedIds.length}
          </Button>
        ) : (
          <span
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
            title={t("sync.trackCount", [
              songs.length,
              formatBytes(totalBytes),
            ])}
          >
            {songs.length} · {formatBytes(totalBytes)}
          </span>
        )}
      </div>

      <SidebarDropZone
        id={sidebarSyncDropId(deviceId)}
        disabled={dragNotOffline}
        className="min-h-0 flex-1 rounded-none border-0"
      >
        <ScrollArea className="h-full">
          <div className="py-1">
            {songs.map((song, index) => {
              const selected = selectedIds.includes(song.id);
              const isSynced = synced.has(song.id);

              return (
                <TrackItem
                  key={song.id}
                  song={song}
                  index={index}
                  size="sm"
                  hideNumber
                  availableActions={[]}
                  alwaysShowActions
                  trailing={
                    <span className="flex items-center gap-1.5">
                      {formatBytes(song.filesize)}
                      {isSynced && (
                        <Check
                          className="text-accent"
                          aria-label={t("sync.syncedToDevice")}
                        />
                      )}
                    </span>
                  }
                  isPlaying={nowPlaying?.id === song.id}
                  // A synced row is done: it stays visible with its tick but
                  // takes no further selection or playback.
                  onClick={isSynced ? undefined : () => toggleSelected(song.id)}
                  onPlay={
                    isSynced
                      ? undefined
                      : () => {
                          // Play the queue from this track, so the playback
                          // queue is what is about to be synced rather than
                          // the whole library.
                          wmmBus.invoke("wmm.playback.playQueue", {
                            songIds: songs.map((s) => s.id),
                          });
                          wmmBus.invoke("wmm.playback.playSong", {
                            songId: song.id,
                          });
                        }
                  }
                  className={cn(
                    "gap-1.5 pl-2",
                    selected && "bg-primary/15 hover:bg-primary/20",
                    isSynced && "opacity-60"
                  )}
                />
              );
            })}

            {songs.length === 0 && showDropHint && (
              <div className="mx-1 rounded-md px-2 py-3 text-center text-xs text-muted-foreground">
                {t("sync.dropToQueue")}
              </div>
            )}
          </div>
        </ScrollArea>
      </SidebarDropZone>

      {/* Handoff: a chip per newly synced track flies out of the queue and
          lands on the device panel, so the transfer is visible rather than
          instant. Portalled to the body: the queue sits inside an
          overflow-hidden card, which would clip a chip crossing into the
          device column. */}
      {createPortal(
        <AnimatePresence>
          {flights.map((flight) => (
            <motion.div
              key={flight.key}
              className="pointer-events-none fixed z-popover flex max-w-[60%] items-center gap-1.5 rounded-full border bg-popover px-2.5 py-1 text-xs shadow-lg"
              style={{ left: flight.from.x, top: flight.from.y }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                x: flight.to.x - flight.from.x,
                y: flight.to.y - flight.from.y,
                opacity: [0, 1, 1, 0],
                scale: [0.9, 1, 1, 0.9],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 1.1,
                ease: "easeInOut",
                times: [0, 0.15, 0.75, 1],
              }}
              onAnimationComplete={() => {
                setFlights((current) =>
                  current.filter((entry) => entry.key !== flight.key)
                );
                onFlightArriveRef.current?.(flight.songId);
              }}
            >
              <Check className="size-3 shrink-0 text-accent" />

              <span className="truncate">{flight.title}</span>
            </motion.div>
          ))}
        </AnimatePresence>,
        document.body
      )}

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("sync.clearQueueTitle")}</DialogTitle>
            <DialogDescription>
              {t("sync.clearQueueDescription", [songs.length])}
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
    </div>
  );
}
