import type { Song } from "@/models/Song";
import type { IMetadataStore } from "@/lib/metadata-utils";
import { FileSystemMetadataStore } from "./";

let fileSystemMetadataStore: FileSystemMetadataStore | null = null;

/**
 * Initializes the metadata store using the root directory handle.
 */
export async function initFileSystemMetadataStore(
  rootDirectory?: FileSystemDirectoryHandle
): Promise<FileSystemMetadataStore> {
  const store = new FileSystemMetadataStore(rootDirectory);
  fileSystemMetadataStore = store;

  if (!rootDirectory) return fileSystemMetadataStore;

  const entries: Array<FileSystemFileHandle> = [];
  await collectFileHandles(rootDirectory, entries);

  for (const fileHandle of entries) {
    const id = rootDirectory.name + "/" + fileHandle.name;
    // Store file handle in memory
    store.setFileHandle(id, fileHandle);

    const filesize = (await fileHandle.getFile()).size;

    const song: Song = {
      id,
      relativePath: rootDirectory.name,
      filename: fileHandle.name,
      filesize,
    };

    await store.saveSong(id, song);
  }

  return store;
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
