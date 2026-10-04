import { getMetadataStore } from "../file-utils";
import type { CombinedMetadataStore } from "../CombinedMetadataStore";
import type { Directory } from "@/models";

export async function getPersistedRootDirectories(): Promise<
  Directory[] | undefined
> {
  const directoryStore = getMetadataStore() as CombinedMetadataStore;
  const directories = await directoryStore.getDirectories();

  if (!directories) {
    return undefined;
  }

  let results: Directory[] = [];

  for (const directory of directories) {
    const { directoryHandle } = directory;

    const perm = await directoryHandle.queryPermission?.({ mode: "readwrite" });

    if (perm === "granted") {
      results.push(directory);
    }

    if (perm === "prompt") {
      // Must be called during a user gesture (click)
      const req = await directoryHandle.requestPermission?.({
        mode: "readwrite",
      });
      if (req === "granted") {
        results.push(directory);
      }
    }
  }
  return results;
}
