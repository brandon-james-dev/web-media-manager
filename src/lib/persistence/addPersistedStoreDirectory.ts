import { uuidv7 } from "uuidv7";
import type { MusicSource } from "@/models";
import type { CombinedMetadataStore } from "./browser/CombinedMetadataStore";
import { getMetadataStore } from "./initMetadataStore";

/**
 * Persist a user-chosen folder as a local ("on device") music source.
 * The granted directory handle is structured-cloned into Dexie, exactly as
 * the old Directory row was; the source record adds kind + capabilities so
 * the same table can later hold subsonic/server instances too.
 */
export function addPersistedStoreDirectory(
  directory: FileSystemDirectoryHandle
): Promise<MusicSource> {
  const store = getMetadataStore() as CombinedMetadataStore;

  const source: MusicSource = {
    id: uuidv7(),
    uriDomain: "local",
    kind: "local",
    name: directory.name,
    handle: directory,
    enabled: true,
    priority: 50,
    createdAt: new Date(),
    capabilities: {
      streaming: true,
      browsing: true,
      searching: true,
      metadataWrite: true,
      libraryScanning: true,
    },
  };

  return store.addSource(source);
}
