import { CombinedMetadataStore } from "./browser/CombinedMetadataStore";
import { DexieMetadataStore, getMetadataDb } from "./dexie";
import {
  FileSystemSourceStore,
  FileSystemMetadataStore,
} from "../persistence/file";
import { type IMetadataStore } from "../contracts";
import { DexieSourceStore } from "./dexie/DexieSourceStore";

let metadataStore: CombinedMetadataStore | null = null;

export function initMetadataStore(): IMetadataStore {
  if (metadataStore) return metadataStore;

  const db = getMetadataDb();
  const dexieStore = new DexieMetadataStore(db);
  const directoryBackingStore = new DexieSourceStore(db);
  const directoryStore = new FileSystemSourceStore(directoryBackingStore);

  const fsStore = new FileSystemMetadataStore(directoryStore);
  fsStore.setBackingStore(dexieStore);

  metadataStore = new CombinedMetadataStore(fsStore, dexieStore);

  return metadataStore;
}

export function getMetadataStore(): IMetadataStore {
  return metadataStore ?? initMetadataStore();
}
