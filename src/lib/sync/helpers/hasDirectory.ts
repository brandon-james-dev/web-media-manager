export async function hasDirectory(
  parent: FileSystemDirectoryHandle,
  name: string
): Promise<boolean> {
  try {
    await parent.getDirectoryHandle(name);

    return true;
  } catch {
    return false;
  }
}
