// Local eval-safe File System Access check. NOTE: must not import
// `use-fs-access` here — its module-scope `window` reference throws inside
// the web worker (which imports this strategy). `typeof` guards the worker.
const fsAccessSupported =
  typeof window !== "undefined" &&
  typeof (window as Window & { showDirectoryPicker?: unknown })
    .showDirectoryPicker === "function";

import { addFolder } from "@/core/scanning";
import { readTags } from "@/core/metadata";
import { getMetadataReader } from "@/core/ports";
import { collectFileHandles } from "@/lib/persistence/file";
import { getJobService } from "@/core/jobs";
import { getSourcesStore } from "@/core/ports";
import { getMetadataStore } from "@/lib";
import type { CombinedMetadataStore } from "@/lib/persistence/browser/CombinedMetadataStore";
import type { Song } from "@/models/Song";
import type { MusicSource } from "@/models";
import type { LocalMusicSource } from "@/core/contracts/sources";
import {
  isLocalSource,
  localSourceFolders,
  localSourceName,
} from "@/core/contracts/sources";
import type { WorkerProgress } from "@/core/jobs";
import type { MusicSourceImportConfig } from "../config";
import { uuidv7 } from "uuidv7";
import type { IMusicSourceStrategy, IJobHandle } from "../IMusicSourceStrategy";
import type { MusicSourceConfigField } from "../MusicSourceConfigField";

/**
 * "On device" source strategy: pick a local folder (browser FS Access),
 * persist it as a local music source, then enqueue a bulk import to read
 * its songs.
 */
export class LocalMusicSourceStrategy implements IMusicSourceStrategy {
  readonly kind = "local" as const;
  readonly name = "On device";
  readonly description = "Add a music folder from this computer";
  readonly isAvailable = fsAccessSupported;
  readonly requiresConfig = true;

  /** A multi-folder picker field — the standard form renders the folder
   *  list with "Add folder"; the picked handles are submitted as
   *  `config.folders`. */
  readonly configFields: MusicSourceConfigField[] = [
    {
      name: "folders",
      label: "Music folders",
      type: "folder",
      options: { multiple: true },
      required: true,
    },
  ];

  async add(options: {
    onSourceAdded?: () => void | Promise<void>;
    config?: unknown;
  }): Promise<void> {
    const config = (options.config ?? {}) as {
      folders?: FileSystemDirectoryHandle[];
    };
    const folders = config.folders ?? [];

    if (!fsAccessSupported) return;
    if (folders.length === 0) return;

    const source = await addFolder(folders);

    getJobService().enqueue({
      type: "Bulk Import",
      payload: { musicSource: source },
    });
    await options.onSourceAdded?.();
  }

  /**
   * Replace the folders of an existing local source and re-import, so songs
   * from added folders appear and songs from removed ones are dropped.
   */
  async updateSource(options: {
    source: MusicSource;
    config?: unknown;
  }): Promise<void> {
    const { source } = options;
    if (!isLocalSource(source)) return;

    const folders = (
      options.config as { folders?: FileSystemDirectoryHandle[] }
    )?.folders;
    if (!folders?.length) throw new Error("Choose at least one folder");

    const updated: LocalMusicSource = {
      ...source,
      handle: folders[0],
      handles: folders,
      name: localSourceName(folders),
    };
    await getSourcesStore().saveSource(updated);
    await this.sync({ source: updated });
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
   * Collect a local source's songs: walk the folder + read tags via TagLib.
   * Runs inside the web worker (UI-free).
   */
  async collectSongs(options: {
    source: MusicSource;
    isCancelled?: () => boolean;
    reportProgress?: (progress: WorkerProgress) => void;
    musicSourceConfig?: MusicSourceImportConfig;
  }): Promise<Song[]> {
    const reader = getMetadataReader();
    const folders = localSourceFolders(options.source as LocalMusicSource);
    const entries: Array<{
      handle: FileSystemFileHandle;
      relativePath: string;
    }> = [];
    for (const folder of folders) {
      const found: typeof entries = [];
      await collectFileHandles(folder, found);
      // With several folders, each path leads with its folder's name so the
      // file can be found again (see `resolveLocalSongFolder`).
      for (const entry of found) {
        entries.push(
          folders.length > 1
            ? {
                ...entry,
                relativePath: `${folder.name}/${entry.relativePath}`,
              }
            : entry
        );
      }
    }

    const songs: Song[] = [];
    for (let index = 0; index < entries.length; index++) {
      if (options.isCancelled?.()) return songs;

      const { handle: fileHandle, relativePath } = entries[index];
      const metadata = await readTags(fileHandle, reader);
      const song: Song = {
        ...metadata,
        id: uuidv7(),
        filename: fileHandle.name,
        filesize: metadata?.filesize ?? 0,
        relativePath,
        sourceId: options.source.id,
      };
      songs.push(song);
    }

    return songs;
  }

  /**
   * Resolve picture bytes for a local song: embedded `data` is used
   * directly (local files carry their artwork inline); a URL without
   * data is not resolvable from the file system.
   */
  async resolvePictureBytes(
    pic: {
      data?: Uint8Array;
      url?: string;
    },
    _song: Song,
    _musicSourceConfig?: MusicSourceImportConfig
  ): Promise<Uint8Array | null> {
    if (pic.data && pic.data.length > 0) return pic.data;
    return null;
  }

  /**
   * Re-walk the local folder and re-import its songs. Enqueues a bulk-import
   * job (progress + completion appear in the notification center). Always
   * returns true — a local folder is always re-scannable.
   */
  async sync(options: {
    source: MusicSource;
    silent?: boolean;
  }): Promise<IJobHandle | null> {
    const { source, silent } = options;
    if (source.kind !== "local") return null;

    const jobId = uuidv7();
    getJobService().enqueue(
      {
        type: "Bulk Import",
        silent,
        payload: { musicSource: source },
      },
      jobId
    );

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
