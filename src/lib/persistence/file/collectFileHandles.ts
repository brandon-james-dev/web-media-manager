import { isValidAudioFile } from "taglib-wasm";

/**
 * Recursively collects file handles and relative paths.
 */
export async function collectFileHandles(
  dir: FileSystemDirectoryHandle,
  out: Array<{ handle: FileSystemFileHandle; relativePath: string }>,
  path: string = ""
): Promise<void> {
  for await (const entry of dir.values()) {
    if (entry.kind === "directory") {
      const subdir = await dir.getDirectoryHandle(entry.name);
      await collectFileHandles(subdir, out, `${path}${entry.name}/`);
      continue;
    }

    if (entry.kind === "file") {
      const fileHandle = await dir.getFileHandle(entry.name);
      const file = await fileHandle.getFile();
      const isValid = await isValidAudioFile(file);

      if (isValid) {
        out.push({
          handle: fileHandle,
          relativePath: `${path}${entry.name}`,
        });
      }
    }
  }
}
