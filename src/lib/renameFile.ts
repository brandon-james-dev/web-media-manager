export async function renameFile(
  dirHandle: FileSystemDirectoryHandle,
  oldHandle: FileSystemFileHandle,
  newName: string
): Promise<FileSystemFileHandle> {
  // Read the original file
  const file = await oldHandle.getFile();
  const bytes = await file.arrayBuffer();

  // Create the new file
  const newHandle = await dirHandle.getFileHandle(newName, { create: true });

  // Write the contents into the new file
  const writable = await newHandle.createWritable();
  await writable.write(bytes);
  await writable.close();

  // Delete the old file
  await dirHandle.removeEntry(oldHandle.name);

  return newHandle;
}
