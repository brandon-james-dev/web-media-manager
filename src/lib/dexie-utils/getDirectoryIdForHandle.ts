import { getMetadataDb } from "./MetadataDb";

export async function getDirectoryIdForHandle(
  directoryHandle: FileSystemDirectoryHandle
): Promise<number> {
  const db = getMetadataDb();

  let directory = await db.directories
    .filter((d) => d.directoryHandle == directoryHandle)
    .first();

  if (!directory) {
    const directoryId = await db.directories.add({
      directoryHandle,
      directoryName: directoryHandle.name,
      createdAt: new Date(),
    });

    directory = await db.directories.get(directoryId);
  }

  if (!directory?.id) {
    throw Error("The directory could not be added to the database");
  }

  if (!directory.id) {
    throw Error("The directory id was null");
  }

  return directory.id;
}
