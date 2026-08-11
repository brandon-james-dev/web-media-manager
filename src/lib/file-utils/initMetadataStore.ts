import type { Song } from "@/models/Song";
import { readSongFile } from "@/lib";
import type { IMetadataStore } from "@/lib/metadata-utils";
import { FileSystemMetadataStore } from "./";
import { TagLibMetadataReader } from "../taglib-metadata-utils";
import { uuidv7 } from "uuidv7";

let fileSystemMetadataStore: FileSystemMetadataStore | null = null;

/**
 * Initializes the metadata store using the root directory handle.
 */
export async function initMetadataStore(
  rootDirectory?: FileSystemDirectoryHandle
): Promise<IMetadataStore> {
  if (!rootDirectory) {
    fileSystemMetadataStore = new FileSystemMetadataStore();
    return fileSystemMetadataStore;
  }

  fileSystemMetadataStore = new FileSystemMetadataStore(rootDirectory);

  const handles: FileSystemFileHandle[] = [];
  await collectFileHandles(rootDirectory, handles);

  // Initialize with empty file handles. Processing begins later.
  for (const fileHandle of handles) {
    const song = {
      id: uuidv7(),
      fileHandle,
    } as Song;
    await fileSystemMetadataStore.saveSong(song.id, song);
  }

  return fileSystemMetadataStore;
}

export async function importSongsIntoStore(
  onProgress?: (progress: {
    song: Song;
    index: number;
    total: number;
    percent: number;
    overall: number;
  }) => void
) {
  const store = getMetadataStore();

  let songs = (await store.getAllSongs()) ?? [];

  const total = songs.length ?? 0;
  let index = 0;

  const reader = new TagLibMetadataReader();

  for await (const song of songs) {
    const songData = await readSongFile(song.fileHandle!, reader);

    if (!songData) continue;

    const updatedSong = await store.saveSong(song.id, { ...song, ...songData });

    if (onProgress) {
      const percent = (index + 1) / total;
      onProgress({
        song: updatedSong,
        index,
        total,
        percent,
        overall: percent,
      });
    }

    index++;
  }
}

/**
 * Recursively collects file handles.
 */
async function collectFileHandles(
  dir: FileSystemDirectoryHandle,
  handles: FileSystemFileHandle[]
) {
  for await (const entry of dir.values()) {
    if (entry.kind === "directory") {
      const subdir = await dir.getDirectoryHandle(entry.name);
      await collectFileHandles(subdir, handles);
      continue;
    }

    if (entry.kind === "file") {
      const fileHandle = await dir.getFileHandle(entry.name);
      handles.push(fileHandle);
    }
  }
}

/**
 * Returns the underlying store instance.
 */
export function getMetadataStore(): IMetadataStore {
  if (!fileSystemMetadataStore) {
    throw new Error(
      "Metadata store not initialized. Call initMetadataStore() first."
    );
  }
  return fileSystemMetadataStore;
}
