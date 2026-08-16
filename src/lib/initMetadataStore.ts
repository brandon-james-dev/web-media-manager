import { CombinedMetadataStore } from "./CombinedMetadataStore";
import { DexieMetadataStore, getMetadataDb } from "./dexie-utils";
import {
  FileSystemDirectoryStore,
  FileSystemMetadataStore,
} from "./file-utils";
import { type IMetadataStore } from "./metadata-utils";
import { DexieDirectoryStore } from "./dexie-utils/DexieDirectoryStore";

let metadataStore: CombinedMetadataStore | null = null;

export function initMetadataStore(): IMetadataStore {
  if (metadataStore) return metadataStore;

  const db = getMetadataDb();
  const dexieStore = new DexieMetadataStore(db);
  const directoryBackingStore = new DexieDirectoryStore(db);
  const directoryStore = new FileSystemDirectoryStore(directoryBackingStore);

  const fsStore = new FileSystemMetadataStore(directoryStore);
  fsStore.setBackingStore(dexieStore);

  metadataStore = new CombinedMetadataStore(fsStore, dexieStore);

  return metadataStore;
}

export function getMetadataStore(): IMetadataStore {
  return metadataStore ?? initMetadataStore();
}
