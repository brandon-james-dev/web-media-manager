import { useCallback, useMemo, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { SyncDevice } from "@/models";
import { formatTrackDuration } from "@/lib/sync/helpers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Item, ItemContent } from "../ui/item";

export interface DeviceLibraryDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  device: SyncDevice;

  /** Delete the given on-device track ids, then refresh the device. */
  onRemoveTracks(device: SyncDevice, trackIds: number[]): Promise<void> | void;
}

/**
 * Browse and delete tracks that are already stored on a device — the
 * management UI needed now that syncing is additive rather than a replace.
 */
export function DeviceLibraryDialog({
  open,
  onOpenChange,
  device,
  onRemoveTracks,
}: DeviceLibraryDialogProps) {
  // Memoized so the `tracks` identity is stable across renders (the `?? []`
  // fallback would otherwise create a new array every render and defeat the
  // filteredTracks memo below).
  const tracks = useMemo(
    () => device.media?.tracks ?? [],
    [device.media?.tracks]
  );

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const filteredTracks = useMemo(() => {
    const text = query.trim().toLowerCase();

    return tracks.filter((track) => {
      if (showOnlySelected && !selected.has(track.id)) return false;
      if (!text) return true;

      return (
        (track.title ?? "").toLowerCase().includes(text) ||
        (track.artist ?? "").toLowerCase().includes(text) ||
        (track.album ?? "").toLowerCase().includes(text)
      );
    });
  }, [tracks, query, showOnlySelected, selected]);

  const toggleTrack = useCallback((trackId: number) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }

      return next;
    });
  }, []);

  const visibleIds = filteredTracks.map((track) => track.id);
  const visibleSelectedCount = visibleIds.filter((id) =>
    selected.has(id)
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }

      return next;
    });
  }

  async function handleRemoveClicked() {
    const trackIds = [...selected];

    if (trackIds.length === 0) return;

    setIsRemoving(true);

    try {
      await onRemoveTracks(device, trackIds);

      // Successful removal: the listing refreshed, so drop the stale choice.
      setSelected(new Set());
      onOpenChange(false);
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage {device.name}</DialogTitle>
          <DialogDescription>
            {tracks.length} track{tracks.length === 1 ? "" : "s"} on this
            device. Select tracks to remove them from the device. Removing here
            never touches your library.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <InputGroup className="max-w-sm">
            <InputGroupInput
              placeholder="Search device tracks..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAllVisible}
              disabled={visibleIds.length === 0}
            >
              {allVisibleSelected ? "Deselect All" : "Select All"}
            </Button>

            <button
              type="button"
              className={`text-sm underline-offset-4 hover:underline ${showOnlySelected ? "text-foreground" : "text-muted-foreground"
                }`}
              onClick={() => setShowOnlySelected((current) => !current)}
            >
              {showOnlySelected
                ? "Showing selected only"
                : "Show selected only"}
            </button>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0 overflow-auto rounded-md border py-0.5 px-1.5">
          <div className="divide-y">
            {filteredTracks.map((track) => {
              const isSelected = selected.has(track.id);

              return (
                <div key={track.id}>
                  <Item>
                    <ItemContent>
                      <label
                        key={track.id}
                        className="flex cursor-pointer items-center gap-2.5"
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleTrack(track.id)}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">
                            {track.title ?? "Untitled"}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {track.artist ?? "Unknown Artist"}
                            {track.album ? ` · ${track.album}` : ""}
                          </div>
                        </div>

                        {track.durationMs ? (
                          <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            {formatTrackDuration(track.durationMs)}
                          </div>
                        ) : null}
                      </label>

                    </ItemContent>
                  </Item>
                </div>
              );
            })}

            {filteredTracks.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {tracks.length === 0
                  ? "No tracks on this device."
                  : "No tracks match your filter."}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Badge variant="secondary" className="mr-auto self-center">
            {selected.size} selected
          </Badge>

          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>

          <Button
            variant="destructive"
            disabled={selected.size === 0 || isRemoving}
            onClick={() => void handleRemoveClicked()}
          >
            <Trash2 />
            {isRemoving
              ? "Removing..."
              : selected.size > 0
                ? `Remove ${selected.size}`
                : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
