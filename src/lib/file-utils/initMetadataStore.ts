import type { IMetadataStore } from "@/lib/metadata-utils";
import { FileSystemMetadataStore } from "./";

let fileSystemMetadataStore: FileSystemMetadataStore | null = null;

/**
 * Initializes the metadata store using the root directory handle.
 */
export async function initFileSystemMetadataStore(
  rootDirectory?: FileSystemDirectoryHandle
): Promise<FileSystemMetadataStore> {
  if (fileSystemMetadataStore) {
    if (rootDirectory) {
      fileSystemMetadataStore.root = rootDirectory;
    }
    return fileSystemMetadataStore;
  }

  fileSystemMetadataStore = new FileSystemMetadataStore(rootDirectory);
  return fileSystemMetadataStore;
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
