import { FileSystemMetadataStore } from "./file-utils";
import type { IMetadataStore } from "./metadata-utils";
import { MemoryMetadataStore } from "./metadata-utils/MemoryMetadataStore";

let metadataStore: IMetadataStore | null = null;

export function initMetadataStore(): IMetadataStore {
  metadataStore = new FileSystemMetadataStore(
    undefined,
    new MemoryMetadataStore()
  );

  return metadataStore;
}

export function getMetadataStore(): IMetadataStore {
  if (metadataStore) return metadataStore;
  metadataStore = initMetadataStore();
  return metadataStore;
}

export function setStoreRootDirectory(
  rootDirectory: FileSystemDirectoryHandle
) {
  const store = getMetadataStore() as FileSystemMetadataStore;
  store.setRootDirectory(rootDirectory);
}
