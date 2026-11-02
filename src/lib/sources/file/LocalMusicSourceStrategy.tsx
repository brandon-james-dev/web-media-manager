import { FolderOpen } from "lucide-react";
import { isApiSupported } from "use-fs-access/core";
import { Badge } from "@/components/ui/badge";
import { addFolder } from "@/core/scanning";
import { getJobService } from "@/core/jobs";
import { getSourcesStore } from "@/core/ports";
import { getMetadataStore } from "@/lib";
import { toast } from "@/components/ui/toast";
import { fileMusicSourceCollector } from "@/lib/sources/collectors";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import type { Song } from "@/models/Song";
import type { MusicSource } from "@/models";
import type { WorkerProgress } from "@/core/jobs";
import { uuidv7 } from "uuidv7";
import type {
  IMusicSourceStrategy,
  IJobHandle,
  MusicSourceConfigField,
} from "../IMusicSourceStrategy";

/**
 * "On device" source strategy: pick a local folder (browser FS Access),
 * persist it as a local music source, then enqueue a bulk import to read
 * its songs.
 */
export class LocalMusicSourceStrategy implements IMusicSourceStrategy {
  readonly kind = "local" as const;
  readonly name = "On device";
  readonly description = "Add a music folder from this computer";
  readonly icon = <FolderOpen className="h-8 w-8" />;
  readonly sourceKindBadge = (
    <Badge variant="secondary">
      <FolderOpen />
      On device
    </Badge>
  );
  readonly requiresConfig = true;

  /** A single folder-picker field — the standard form renders a
   *  "Choose folder" button; the picked handle is submitted as `config.folder`. */
  readonly configFields: MusicSourceConfigField[] = [
    {
      name: "folder",
      label: "Music folder",
      type: "folder",
      required: true,
      validate: (v) => (!v ? "Choose a folder" : undefined),
    },
  ];

  async add(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void> {
    const config = (options.config ?? {}) as {
      folder?: FileSystemDirectoryHandle;
    };
    const dirHandle = config.folder;

    if (!isApiSupported) {
      toast.add({
        type: "error",
        title: "File System Access not supported in this browser.",
      });
      return;
    }
    if (!dirHandle) return;

    const source = await addFolder(dirHandle);

    getJobService().enqueue({
      type: "Bulk Import",
      payload: { musicSource: source },
    });

    toast.add({
      type: "success",
      title: `Added music source "${source.name}"`,
    });

    await options.onSourceAdded?.();
  }

  /**
   * Resolve the playable bytes of a local song from its file handle.
   * Returns null when the song's file is not available in the metadata
   * store (moved/deleted after the scan).
   */
  async resolveSongBytes(song: Song): Promise<ArrayBuffer | null> {
    const metadataStore = getMetadataStore() as CombinedMetadataStore;
    const fsMetadataStore = metadataStore.getFileSystem();

    const songFileHandle = await fsMetadataStore.getFileHandle(song.id);
    if (!songFileHandle) return null;

    const songFile = await songFileHandle.getFile();
    return await songFile.arrayBuffer();
  }

  /**
   * Resolve picture bytes for a local song: embedded `data` is used
   * directly (local files carry their artwork inline); a URL without
   * data is not resolvable from the file system.
   */
  async resolvePictureBytes(pic: {
    data?: Uint8Array;
    url?: string;
  }, song: Song): Promise<Uint8Array | null> {
    return fileMusicSourceCollector.resolvePictureBytes(pic, song);
  }

  /**
   * Collect a local source's songs — delegates to the pure `fileMusicSourceCollector`
   * (the same one the worker's bulk import uses), so UI and worker share
   * one implementation.
   */
  async collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
  }): Promise<Song[]> {
    return fileMusicSourceCollector.collectSongs(options);
  }

  /**
   * Re-walk the local folder and re-import its songs. Enqueues a bulk-import
   * job (progress + completion appear in the notification center). Always
   * returns true — a local folder is always re-scannable.
   */
  sync(options: { source: MusicSource; silent?: boolean }): IJobHandle | null {
    const { source, silent } = options;
    if (source.kind !== "local") return null;

    const jobId = uuidv7();
    getJobService().enqueue({
      type: "Bulk Import",
      silent,
      payload: { musicSource: source },
    }, jobId);

    return {
      jobId,
      cancel: () => getJobService().cancelJob(jobId),
    };
  }

  /**
   * Cancel an in-flight add/sync job for this source kind.
   */
  cancelSync(jobId?: string): void {
    if (jobId) getJobService().cancelJob(jobId);
  }

  /**
   * Remove the local source: the store's `deleteSource` drops both the
   * source record and the songs imported from it.
   */
  async removeSource(options: {
    source: MusicSource;
    onSourceRemoved?: () => void | Promise<void>;
  }): Promise<void> {
    const store = getSourcesStore();
    await store.deleteSource(options.source.id);
    await options.onSourceRemoved?.();
  }
}
