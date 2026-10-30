import { renameFile } from "@/lib/renameFile";

/**
 * Rename a file in the library. Open Subsonic equivalent: n/a (WMM ext).
 * Note: operates directly on FS Access handles (browser-only today).
 */
export async function rename(
  dirHandle: FileSystemDirectoryHandle,
  oldHandle: FileSystemFileHandle,
  newName: string
): Promise<FileSystemFileHandle> {
  return renameFile(dirHandle, oldHandle, newName);
}
