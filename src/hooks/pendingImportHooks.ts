import { mediaDb } from "@/data";
import type { Folder, PendingImportFile } from "@/models";

async function useInsertImportedFolder(
  directoryHandle: FileSystemDirectoryHandle,
) {
  const folderId = await mediaDb.folders.add({
    directoryHandle,
    directoryName: directoryHandle.name,
    createdAt: Date.now(),
  });
  const folder = await mediaDb.folders.get(folderId);

  return folder!;
}

async function useInsertPendingImport(
  folder: Folder,
  files: PendingImportFile[],
) {
  const jobId = await mediaDb.pendingImports.add({
    folder,
    files,
    createdAt: Date.now(),
  });
  return jobId;
}

async function sortPendingImportsByCol(
  colName: string,
  direction: "asc" | "desc" = "asc",
) {
  let query = mediaDb.pendingImports.orderBy(colName);
  if (direction == "asc") {
    query = query.reverse();
  }
  return await query.toArray();
}

async function sortPendingArtByCol(
  colName: string,
  direction: "asc" | "desc" = "asc",
) {
  let query = mediaDb.pendingArt.orderBy(colName);
  if (direction == "asc") {
    query = query.reverse();
  }
  return await query.toArray();
}

export {
  useInsertPendingImport,
  sortPendingImportsByCol,
  sortPendingArtByCol,
  useInsertImportedFolder,
};
