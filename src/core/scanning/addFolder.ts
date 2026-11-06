import { addPersistedStoreDirectory } from "@/lib/persistence/addPersistedStoreDirectory";
import type { MusicSource } from "@/models";

/**
 * Add one or more chosen folders to the library as a single local source
 * (persisted).
 * Open Subsonic equivalent: n/a — WMM extension (no Open Subsonic
 * `addFolder` endpoint; closest is the read-only `getMusicFolders`).
 */
export async function addFolder(
  handles: FileSystemDirectoryHandle | FileSystemDirectoryHandle[]
): Promise<MusicSource> {
  return addPersistedStoreDirectory(handles);
}
