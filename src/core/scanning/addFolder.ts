import { addPersistedStoreDirectory } from "@/lib/persistence/addPersistedStoreDirectory";
import type { MusicSource } from "@/models";

/**
 * Add a chosen folder to the library (persisted).
 * Open Subsonic equivalent: n/a — WMM extension (no Open Subsonic
 * `addFolder` endpoint; closest is the read-only `getMusicFolders`).
 */
export async function addFolder(
  handle: FileSystemDirectoryHandle
): Promise<MusicSource> {
  return addPersistedStoreDirectory(handle);
}
