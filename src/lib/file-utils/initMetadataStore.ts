import type { Song } from "@/models/Song";
import { readSongFiles } from "@/lib";
import type { IMetadataStore } from "@/lib/metadata-utils";
import { FileSystemMetadataStore } from "./";
import { TagLibMetadataReader } from "../taglib-metadata-utils";

let fileSystemMetadataStore: FileSystemMetadataStore | null = null;

/**
 * Initializes the metadata store using the root directory handle.
 * Loads all songs using readSongFiles and builds the metadata map.
 */
export async function initMetadataStore(
  rootDirectory?: FileSystemDirectoryHandle,
  onProgress?: (progress: {
    song: Song;
    index: number;
    total: number;
    percent: number;
    overall: number;
  }) => void
): Promise<IMetadataStore> {
  const songs = new Map<string, Song>();

  if (!rootDirectory) {
    fileSystemMetadataStore = new FileSystemMetadataStore();
    return fileSystemMetadataStore;
  }

  const handles: FileSystemFileHandle[] = [];
  await collectFileHandles(rootDirectory, handles);

  const total = handles.length;
  let index = 0;

  const reader = new TagLibMetadataReader();

  for await (const song of readSongFiles(handles, reader)) {
    songs.set(song.id, song);

    if (onProgress) {
      const percent = (index + 1) / total;
      onProgress({
        song,
        index,
        total,
        percent,
        overall: percent,
      });
    }

    index++;
  }

  fileSystemMetadataStore = new FileSystemMetadataStore(rootDirectory, songs);

  return fileSystemMetadataStore;
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
