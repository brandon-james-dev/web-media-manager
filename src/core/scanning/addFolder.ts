import { addPersistedStoreDirectory } from "@/lib/persistence/addPersistedStoreDirectory";
import type { Directory } from "@/models";

/**
 * Add a chosen folder to the library (persisted).
 * Open Subsonic equivalent: music folder management.
 */
export async function addFolder(
  handle: FileSystemDirectoryHandle
): Promise<Directory> {
  return addPersistedStoreDirectory(handle);
}
