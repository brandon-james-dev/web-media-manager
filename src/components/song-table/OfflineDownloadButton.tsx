import { Download, HardDriveDownload, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "@/components/ui/toast";
import { useOfflineDownloads, useOfflineSongs } from "@/hooks";
import { cacheSongsOffline, removeSongOffline } from "@/lib/offline";
import type { Song } from "@/models";

interface OfflineDownloadButtonProps {
  /** The row's song; its cached state drives the icon. */
  song: Song;
  /**
   * Songs to cache when pressed. Defaults to `song`; pass a group to download
   * an artist or an album in one batch.
   */
  songs?: Song[];
  /** Batch id the download reports progress under. */
  batchId?: string;
  /** What is being downloaded, for the title and the failure toast. */
  label?: string;
  className?: string;
}

/**
 * The download toggle for a song, or for a group of songs.
 *
 * Caching runs as an "Offline Download" worker job so the main thread stays
 * free. The button only reports state: it spins while its batch is still
 * running and disables itself so a second click cannot start a duplicate.
 * Failures are surfaced rather than swallowed — a silent rejection is
 * indistinguishable from a dead button.
 */
export function OfflineDownloadButton({
  song,
  songs,
  batchId,
  label,
  className,
}: OfflineDownloadButtonProps) {
  const { offlineSongIds } = useOfflineSongs();
  const batches = useOfflineDownloads();
  const [busy, setBusy] = useState(false);

  const cached = offlineSongIds.has(song.id);
  const targets = songs ?? [song];
  const id = batchId ?? `song:${song.id}`;
  const name = label ?? song.title ?? song.filename;

  const downloading = useMemo(() => {
    for (const batch of batches.values()) {
      if (batch.state !== "running") continue;
      if (batch.id === id) {
        if (batch.doneIds.length < batch.songIds.length) return true;
        continue;
      }
      if (!batch.songIds.includes(song.id)) continue;
      if (!batch.doneIds.includes(song.id)) return true;
    }
    return false;
  }, [batches, id, song.id]);

  const pending = busy || downloading;

  async function toggle(): Promise<void> {
    if (busy) return;
    setBusy(true);

    try {
      if (cached) {
        await removeSongOffline(song.id);
      } else {
        const result = await cacheSongsOffline(targets, id);

        if (result.failed.length > 0) {
          toast.add({
            type: "error",
            title: `Could not cache ${result.failed.length} song${
              result.failed.length === 1 ? "" : "s"
            }`,
            description: result.failed.join(", "),
          });
        }
      }
    } catch {
      toast.add({
        type: "error",
        title: cached ? "Could not remove download" : "Could not cache song",
        description: name,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={
        className ??
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/15 hover:text-foreground"
      }
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        void toggle();
      }}
      title={
        pending
          ? `Downloading ${name}`
          : cached
            ? "Remove download"
            : `Make ${name} available offline`
      }
      aria-label={
        pending
          ? `Downloading ${name}`
          : cached
            ? "Remove download"
            : `Make ${name} available offline`
      }
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
