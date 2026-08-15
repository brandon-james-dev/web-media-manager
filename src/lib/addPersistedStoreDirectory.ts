import { uuidv7 } from "uuidv7";
import type { Directory } from "@/models";
import type { CombinedMetadataStore } from "./CombinedMetadataStore";
import { getMetadataStore } from "./initMetadataStore";

export function addPersistedStoreDirectory(
  directory: FileSystemDirectoryHandle
) {
  const store = getMetadataStore() as CombinedMetadataStore;

  const dir = {
    id: uuidv7(),
    directoryHandle: directory,
    directoryName: directory.name,
    createdAt: new Date(),
  } as Directory;

  store.addDirectory(dir);
}
