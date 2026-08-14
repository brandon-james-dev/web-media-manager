import type { Directory } from "@/models/";
import { getMetadataDb } from "./MetadataDb";

export async function getPersistedRootDirectory(): Promise<
  Directory | undefined
> {
  const db = getMetadataDb();
  const directory = await db.directories.get(1);

  if (!directory?.directoryHandle) return undefined;

  const handle = directory.directoryHandle as any;

  const perm = await handle.queryPermission?.({ mode: "readwrite" });

  if (perm === "granted") {
    return directory;
  }

  if (perm === "prompt") {
    // Must be called during a user gesture (click)
    const req = await handle.requestPermission?.({ mode: "readwrite" });
    if (req === "granted") {
      return directory;
    }
    return undefined;
  }

  return undefined;
}
