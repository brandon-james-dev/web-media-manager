import { getMetadataStore } from "../file";
import { isLocalSource } from "@/core/contracts/sources";
import type { CombinedMetadataStore } from "../browser/CombinedMetadataStore";
import type { LocalMusicSource } from "@/models";

export async function getPersistedRootDirectories(): Promise<
  LocalMusicSource[] | undefined
> {
  const directoryStore = getMetadataStore() as CombinedMetadataStore;
  const directories = await directoryStore.getSources();

  if (!directories) {
    return undefined;
  }

  let results: LocalMusicSource[] = [];

  for (const directory of directories) {
    if (!isLocalSource(directory)) continue;
    const { handle } = directory;

    // A persisted row can predate handle saving (or lose it to a storage
    // migration) — skip it rather than throw and unmount the library load.
    if (!handle) continue;

    const perm = await handle.queryPermission?.({ mode: "readwrite" });

    if (perm === "granted") {
      results.push(directory);
    }

    if (perm === "prompt") {
      // Must be called during a user gesture (click)
      const req = await handle.requestPermission?.({
        mode: "readwrite",
      });
      if (req === "granted") {
        results.push(directory);
      }
    }
  }
  return results;
}
