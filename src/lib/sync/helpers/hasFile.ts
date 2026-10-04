export async function hasFile(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<boolean> {
  try {
    await parent.getFileHandle(name);

    return true;
  } catch {
    return false;
  }
}
