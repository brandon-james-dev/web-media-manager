import { mediaDb } from "@/data";
import type { PendingImportFile } from "@/models";

async function useInsertPendingImport(
  directoryHandle: FileSystemDirectoryHandle,
  files: PendingImportFile[],
) {
  const jobId = await mediaDb.pendingImports.add({
    directoryHandle,
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

export { useInsertPendingImport, sortPendingImportsByCol, sortPendingArtByCol };