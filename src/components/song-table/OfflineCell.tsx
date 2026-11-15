import { Check, Download, HardDriveDownload, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  useOfflineDownloads,
  useOfflineSongs,
  useSourceKinds,
} from "@/hooks";
import { cacheSongOffline, removeSongOffline } from "@/lib/offline";
import { toast } from "@/components/ui/toast";
import type { Song } from "@/models";

/**
 * The Offline column's cell: shows whether a song's audio is cached and
 * toggles it. Cached songs are the only ones a sync job can read from a
 * remote source, so this is also the way to make a song syncable.
 *
 * A local folder and a sync device already hold their own audio, so their
 * songs show a plain tick: there is nothing to download and nothing to
 * remove, and the cell is not a button.
 */
export function OfflineCell({ song }: { song: Song }) {
  const { offlineSongIds } = useOfflineSongs();
  const sourceKinds = useSourceKinds();
  const batches = useOfflineDownloads();
  const [busy, setBusy] = useState(false);

  const kind = sourceKinds.get(song.sourceId);
  const alwaysOffline = kind === "local" || kind === "sync";

  const cached = offlineSongIds.has(song.id);

  // A download started anywhere — this cell, the context menu, an album — puts
  // the song in a running batch, so the spinner follows the work rather than
  // only this button's own click.
  const downloading = useMemo(() => {
    for (const batch of batches.values()) {
      if (batch.state !== "running") continue;
      if (!batch.songIds.includes(song.id)) continue;
      if (!batch.doneIds.includes(song.id)) return true;
    }
    return false;
  }, [batches, song.id]);

  const pending = busy || downloading;

  if (alwaysOffline) {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center text-accent"
        title="Stored on this device"
        aria-label="Stored on this device"
      >
        <Check size={14} strokeWidth={3} />
      </span>
    );
  }

  async function toggle(): Promise<void> {
    if (busy) return;
    setBusy(true);

    try {
      if (cached) {
        await removeSongOffline(song.id);
      } else {
        await cacheSongOffline(song);
      }
    } catch {
      toast.add({
        type: "error",
        title: cached ? "Could not remove download" : "Could not cache song",
        description: song.title ?? song.filename,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/15 hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        void toggle();
      }}
      title={cached ? "Remove download" : "Make available offline"}
      aria-label={cached ? "Remove download" : "Make available offline"}
      aria-pressed={cached}
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : cached ? (
        <HardDriveDownload size={14} className="text-accent" />
      ) : (
        <Download size={14} />
      )}
    </button>
  );
}
