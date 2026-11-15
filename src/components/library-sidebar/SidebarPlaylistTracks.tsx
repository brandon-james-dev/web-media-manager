import { useEffect, useState } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { ArrowDownAZ, ChevronLeft, ListChecks, Trash2, X } from "lucide-react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrackItem } from "@/components/track-item";
import {
  deletePlaylist,
  getPlaylist,
  isPlaylistReadOnly,
  removeSongsFromPlaylist,
  savePlaylist,
} from "@/core/playlists";
import { getPlaylistStore, getSourcesStore } from "@/core/ports";
import { usePlayback, useSongs } from "@/hooks";
import { wmmBus } from "@/events";
import { cn } from "cn";
import type { MusicSource } from "@/models";
import { FAVORITES_PLAYLIST_ID } from "@/models";
import type { Playlist } from "@/models/Playlist";
import { DraggableTrack } from "./DraggableTrack";
import { SidebarRemoveZone } from "./SidebarRemoveZone";
import { sidebarPlaylistDropId, sidebarPlaylistEmptyDropId } from "./sidebarDrop";

interface SidebarPlaylistTracksProps {
  playlistId: string;
  onBack: () => void;
}

/**
 * The empty-state placeholder, which doubles as a drop target while a drag is
 * in flight so an empty playlist can be filled without aiming at the header.
 */
function EmptyDropZone({ playlistId }: { playlistId: string }) {
  const { active } = useDndContext();
  const { setNodeRef, isOver } = useDroppable({
    id: sidebarPlaylistEmptyDropId(playlistId),
  });

  return (
    <div
      ref={setNodeRef}
      data-sidebar-drop={sidebarPlaylistEmptyDropId(playlistId)}
      className={cn(
        "mx-1 rounded-md px-2 py-3 text-center text-xs text-muted-foreground transition-colors",
        active !== null && !isOver && "outline-1 outline-dashed outline-border",
        isOver && "bg-primary/15 text-foreground ring-2 ring-primary ring-inset"
      )}
    >
      {active !== null ? "Drop here to add" : "No tracks yet"}
    </div>
  );
}

/**
 * One playlist's tracks, sized for the sidebar.
 *
 * Rows stay draggable, so a track can be dragged from here onto another
 * playlist or a sync device in the list behind this view.
 */
export function SidebarPlaylistTracks({
  playlistId,
  onBack,
}: SidebarPlaylistTracksProps) {
  const { songs } = useSongs();
  const { nowPlaying } = usePlayback();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [sources, setSources] = useState<MusicSource[]>([]);
  // Selected track ids, so several can be removed in one go.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // The open playlist stays a drop target, so tracks can be dropped onto it
  // while its own contents are on screen.
  const { setNodeRef, isOver } = useDroppable({
    id: sidebarPlaylistDropId(playlistId),
  });
  // A track dragged from this playlist is already in it, so dropping it back
  // would change nothing: the panel stays unhighlighted for that drag.
  const { active } = useDndContext();
  const draggingFromHere = active?.data.current?.fromPlaylistId === playlistId;

  // A different playlist starts with nothing selected.
  useEffect(() => {
    setSelectedIds([]);
  }, [playlistId]);

  // Whether this playlist can be edited at all: a playlist from a source that
  // cannot write playlists offers no selection or removal UI.
  useEffect(() => {
    let cancelled = false;
    getSourcesStore()
      .getSources()
      .then((next) => {
        if (!cancelled) setSources(next);
      })
      .catch(() => {
        // No source store registered: treat the playlist as editable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const readOnly = playlist !== null && isPlaylistReadOnly(playlist, sources);

  // Edit mode is the page's editing context; the playlist-wide actions only
  // make sense there.
  const { mode } = useParams();
  const editMode = mode === "edit";

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
    void removeSongsFromPlaylist(playlistId, removing).catch((error) => {
      console.warn("Could not remove the tracks from the playlist", error);
    });
  }

  /** Delete the whole playlist and return to the list. */
  function confirmDeletePlaylist(): void {
    setDeleteOpen(false);
    void deletePlaylist(playlistId)
      .then(() => onBack())
      .catch((error) => {
        console.warn("Could not delete the playlist", error);
      });
  }

  /** Sort the playlist's tracks by title. */
  function reorderAlphabetically(): void {
    if (playlist === null) {
      return;
    }
    const byId = new Map(songs.map((song) => [song.id, song]));
    const sorted = [...playlist.songs].sort((a, b) =>
      (byId.get(a.songId)?.title ?? "").localeCompare(
        byId.get(b.songId)?.title ?? ""
      )
    );
    void savePlaylist({
      id: playlist.id,
      name: playlist.name,
      songs: sorted,
    }).catch((error) => {
      console.warn("Could not reorder the playlist", error);
    });
  }

  useEffect(() => {
    let cancelled = false;
    const store = (() => {
      try {
        return getPlaylistStore();
      } catch {
        // No playlist store registered for this binding.
        return null;
      }
    })();

    if (!store) {
      return;
    }

    const load = () => {
      void getPlaylist(playlistId).then((next) => {
        if (!cancelled) {
          setPlaylist(next);
        }
      });
    };

    load();

    // Track removals and additions land as store updates, so the list follows
    // them without being reopened.
    const offUpdated = store.onUpdated((updated) => {
      if (updated.id === playlistId) {
        setPlaylist(updated);
      }
    });
    const offDeleted = store.onDeleted((deleted) => {
      if (deleted.id === playlistId) {
        setPlaylist(null);
      }
    });

    return () => {
      cancelled = true;
      offUpdated();
      offDeleted();
    };
  }, [playlistId]);

  const byId = new Map(songs.map((song) => [song.id, song]));
  const tracks = (playlist?.songs ?? [])
    .map((entry) => byId.get(entry.songId))
    .filter((song) => song !== undefined);

  return (
    // The whole panel is the drop target while a playlist is open, so a track
    // can be dropped anywhere in the sidebar rather than onto the header. The
    // target is an overlay rather than the panel itself: a leaf box is what
    // dnd-kit measures reliably, and `pointer-events-none` keeps the rows
    // clickable underneath.
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        ref={setNodeRef}
        data-sidebar-drop={sidebarPlaylistDropId(playlistId)}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-10 rounded-md transition-colors",
          isOver &&
            !draggingFromHere &&
            "bg-primary/10 ring-2 ring-primary ring-inset"
        )}
      />
      <div className="flex items-center gap-1 border-b px-2 py-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0"
          title="Back to playlists"
          aria-label="Back to playlists"
          onClick={onBack}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {playlist?.name ?? "Playlist"}
        </span>
        {editMode && !readOnly && playlistId !== FAVORITES_PLAYLIST_ID && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0"
              title="Reorder tracks A–Z"
              aria-label="Reorder tracks alphabetically"
              onClick={reorderAlphabetically}
            >
              <ArrowDownAZ />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0"
              title="Delete playlist"
              aria-label="Delete playlist"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 />
            </Button>
          </>
        )}
        {!readOnly && tracks.length > 0 && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            title="Select all"
            aria-label="Select all tracks"
            onClick={() => setSelectedIds(tracks.map((track) => track.id))}
          >
            <ListChecks />
          </Button>
        )}
        {!readOnly && selectedIds.length > 0 && (
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
        {!readOnly && selectedIds.length > 0 ? (
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
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {tracks.length}
          </span>
        )}
      </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="py-1">
          {tracks.map((song, index) => {
            const selected = selectedIds.includes(song.id);

            return (
              <DraggableTrack
                key={song.id}
                songId={song.id}
                songIds={selected ? selectedIds : undefined}
                fromPlaylistId={playlistId}
              >
                <TrackItem
                  song={song}
                  index={index}
                  size="sm"
                  hideNumber
                  alwaysShowActions
                  isPlaying={nowPlaying?.id === song.id}
                  onClick={
                    readOnly ? undefined : () => toggleSelected(song.id)
                  }
                  onPlay={() => {
                    // Play the playlist from this track, so the queue is the
                    // playlist rather than the whole library.
                    wmmBus.invoke("wmm.playback.playQueue", {
                      songIds: tracks.map((t) => t.id),
                    });
                    wmmBus.invoke("wmm.playback.playSong", { songId: song.id });
                  }}
                  className={cn(
                    "gap-1.5 pl-2",
                    selected && "bg-primary/15 hover:bg-primary/20"
                  )}
                />
              </DraggableTrack>
            );
          })}

          {tracks.length === 0 && (
            <EmptyDropZone playlistId={playlistId} />
          )}
        </div>
      </ScrollArea>

      {!readOnly && <SidebarRemoveZone playlistId={playlistId} />}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="select-none w-lg">
          <DialogHeader>
            <DialogTitle>Delete Playlist</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium">{playlist?.name}</span>. The songs
              themselves stay in your library.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button variant="destructive" onClick={confirmDeletePlaylist}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
