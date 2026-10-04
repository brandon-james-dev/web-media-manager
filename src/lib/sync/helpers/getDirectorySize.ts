export async function getDirectorySize(
  directory: FileSystemDirectoryHandle
): Promise<number> {
  let size = 0;

  for await (const entry of directory.values()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();

      size += file.size;
    } else {
      size += await getDirectorySize(entry);
    }
  }

  return size;
}
