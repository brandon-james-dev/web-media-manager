import { uuidv7 } from "uuidv7";
import type { MusicSource } from "@/models";
import { localSourceName } from "@/core/contracts/sources";
import type { CombinedMetadataStore } from "./browser/CombinedMetadataStore";
import { getMetadataStore } from "./initMetadataStore";

/**
 * Persist a user-chosen folder as a local ("on device") music source.
 * The granted directory handle is structured-cloned into Dexie, exactly as
 * the old Directory row was; the source record adds kind + capabilities so
 * the same table can later hold subsonic/server instances too.
 */
export function addPersistedStoreDirectory(
  directories: FileSystemDirectoryHandle | FileSystemDirectoryHandle[]
): Promise<MusicSource> {
  const folders = Array.isArray(directories) ? directories : [directories];
  const directory = folders[0];
  const store = getMetadataStore() as CombinedMetadataStore;

  const source: MusicSource = {
    id: uuidv7(),
    uriDomain: "local",
    kind: "local",
    name: localSourceName(folders),
    handle: directory,
    handles: folders,
    enabled: true,
    priority: 50,
    createdAt: new Date(),
    capabilities: {
      streaming: true,
      browsing: true,
      searching: true,
      metadataWrite: true,
      libraryScanning: true,
      playlistWrite: true,
    },
  };

  return store.addSource(source);
}
