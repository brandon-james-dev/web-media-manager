import { Check } from "lucide-react";
import { useSourceKinds } from "@/hooks";
import { useTranslation } from "@/i18n";
import { isAlwaysOfflineKind } from "@/lib/offline";
import type { Song } from "@/models";
import { OfflineDownloadButton } from "./OfflineDownloadButton";

interface OfflineCellProps {
  /** The row's song; its cached state drives the icon. */
  song: Song;
  /**
   * Songs to cache when the button is pressed. Defaults to `song`; pass a
   * group to download an artist or an album in one batch.
   */
  songs?: Song[];
  /** Batch id the download reports progress under. */
  batchId?: string;
  /** What is being downloaded, for the title and the failure toast. */
  label?: string;
}

/**
 * The Offline column's cell: shows whether a song's audio is cached and
 * toggles it. Cached songs are the only ones a sync job can read from a
 * remote source, so this is also the way to make a song syncable.
 *
 * A local folder and a sync device already hold their own audio, so their
 * songs show a plain tick: there is nothing to download and nothing to
 * remove, and the cell is not a button.
 */
export function OfflineCell({ song, songs, batchId, label }: OfflineCellProps) {
  const sourceKinds = useSourceKinds();
  const { t } = useTranslation();
  const kind = sourceKinds.get(song.sourceId);

  if (isAlwaysOfflineKind(kind)) {
    return (
      <span
        className="inline-flex h-6 w-6 items-center justify-center text-accent"
        title={t("library.storedOnDevice")}
        aria-label={t("library.storedOnDevice")}
      >
        <Check size={14} strokeWidth={3} />
      </span>
    );
  }

  return (
    <OfflineDownloadButton
      song={song}
      songs={songs}
      batchId={batchId}
      label={label}
    />
  );
}
