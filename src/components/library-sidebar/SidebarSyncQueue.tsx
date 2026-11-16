import { useEffect, useMemo, useRef, useState } from "react";
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
import { formatBytes } from "@/lib/sync/helpers/formatBytes";
import { useOfflineSongs, usePlayback, useSync, useSyncUiVisible } from "@/hooks";
import { useDndContext } from "@dnd-kit/core";
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
}: SidebarSyncQueueProps) {
  const { nowPlaying } = usePlayback();
  const { isSyncing, syncProgress, cancelSync, syncedSongIds, syncCompleted } =
    useSync();
  useSyncUiVisible();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
    { key: number; title: string; distance: number }[]
  >([]);

  useEffect(() => {
    const arrived = syncedSongIds.filter((id) => !seenSynced.current.has(id));
    seenSynced.current = new Set(syncedSongIds);

    if (arrived.length === 0) return;

    const distance = rootRef.current?.clientWidth ?? 320;

    setFlights((current) => [
      ...current,
      ...arrived.map((id) => ({
        key: nextFlightKey.current++,
        title: songs.find((song) => song.id === id)?.title ?? "Track",
        distance,
      })),
    ]);
  }, [syncedSongIds, songs]);

  // Total size of the queued tracks, shown beside the count so the panel says
  // how much will be written to the device.
  const totalBytes = useMemo(
    () => songs.reduce((sum, song) => sum + (song.filesize ?? 0), 0),
    [songs]
  );

  // A song that leaves the queue (synced, or removed elsewhere) must not stay
  // selected, or the remove button would count rows that are no longer there.
  useEffect(() => {
    const present = new Set(songs.map((song) => song.id));
    setSelectedIds((current) => {
      const next = current.filter((id) => present.has(id));
      return next.length === current.length ? current : next;
    });
  }, [songs]);

  function toggleSelected(songId: string): void {
    setSelectedIds((current) =>
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
    setSelectedIds([]);
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
            aria-label="Sync progress, click to cancel"
            title="Cancel sync"
            onClick={cancelSync}
          >
            <div className="flex items-baseline justify-between gap-1 text-xs">
              <span className="truncate">Syncing</span>
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
            title="Clear the synced queue"
            aria-label="Sync completed, clear the queue"
            onClick={() => setClearOpen(true)}
          >
            <Check />
            Sync completed
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 min-w-0 flex-1 justify-start gap-1 px-1.5 text-xs"
            title={
              songs.length === 0
                ? "Queue some tracks to sync"
                : `Sync ${songs.length} queued track${songs.length === 1 ? "" : "s"} to the device`
            }
            aria-label="Sync queue to device"
            disabled={songs.length === 0 || isSyncing}
            onClick={() => wmmBus.invoke("wmm.sync.sync", { deviceId })}
          >
            <ArrowDownToLine />
            Sync
          </Button>
        )}
        {songs.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title="Select all"
            aria-label="Select all queued tracks"
            onClick={() => setSelectedIds(songs.map((song) => song.id))}
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
            title={`Remove ${selectedIds.length} selected`}
            aria-label={`Remove ${selectedIds.length} selected tracks`}
            onClick={removeSelected}
          >
            <Trash2 />
            {selectedIds.length}
          </Button>
        ) : (
          <span
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
            title={`${songs.length} track${songs.length === 1 ? "" : "s"}, ${formatBytes(totalBytes)}`}
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
                          aria-label="Synced to device"
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
                Drop tracks here to queue them
              </div>
            )}
          </div>
        </ScrollArea>
      </SidebarDropZone>

      {/* Handoff: a chip per newly synced track flies out of the queue toward
          the device panel, so the transfer is visible rather than instant. */}
      <AnimatePresence>
        {flights.map((flight) => (
          <motion.div
            key={flight.key}
            className="pointer-events-none absolute bottom-3 left-2 z-10 flex max-w-[60%] items-center gap-1.5 rounded-full border bg-popover px-2.5 py-1 text-xs shadow-lg"
            initial={{ x: 0, opacity: 0, scale: 0.9 }}
            animate={{
              x: flight.distance - 80,
              opacity: [0, 1, 1, 0],
              scale: [0.9, 1, 1, 0.95],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 1.1,
              ease: "easeInOut",
              times: [0, 0.15, 0.75, 1],
            }}
            onAnimationComplete={() =>
              setFlights((current) =>
                current.filter((entry) => entry.key !== flight.key)
              )
            }
          >
            <Check className="size-3 shrink-0 text-accent" />

            <span className="truncate">{flight.title}</span>
          </motion.div>
        ))}
      </AnimatePresence>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Clear the synced queue?</DialogTitle>
            <DialogDescription>
              {songs.length} track{songs.length === 1 ? "" : "s"} have been
              written to the device. Clearing the queue does not remove them
              from the device.
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
    </div>
  );
}
