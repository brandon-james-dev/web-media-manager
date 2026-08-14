import { CombinedMetadataStore } from "./CombinedMetadataStore";
import {
  DexieMetadataStore,
  getMetadataDb,
  getPersistedRootDirectory,
} from "./dexie-utils";
import { FileSystemMetadataStore } from "./file-utils";
import type { IMetadataStore } from "./metadata-utils";

let metadataStore: CombinedMetadataStore | null = null;

const persistedDirectory = await getPersistedRootDirectory();

export function initMetadataStore(): IMetadataStore {
  if (metadataStore) return metadataStore;

  const dexieStore = new DexieMetadataStore(getMetadataDb());

  const fsStore = new FileSystemMetadataStore(
    persistedDirectory?.directoryHandle
  );
  fsStore.setBackingStore(dexieStore);

  metadataStore = new CombinedMetadataStore(fsStore, dexieStore);

  return metadataStore;
}

export function getMetadataStore(): IMetadataStore {
  return metadataStore ?? initMetadataStore();
}

export function persistStoreRootDirectory(
  rootDirectory: FileSystemDirectoryHandle
) {
  const store = getMetadataStore() as CombinedMetadataStore;
  store.setRootDirectory(rootDirectory);
}
