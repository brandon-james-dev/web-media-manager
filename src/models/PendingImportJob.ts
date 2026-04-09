import type { Folder } from "./Folder";

/**
 * A background job for user-selected files which are to be imported by a worker.
 */
interface PendingImportJob {
  /**
   * A unique incrementing id
   */
  id?: number;

  /**
   * The folder the pending import job is to be executed from
   */
  folder: Folder;

  /**
   * All files initially detected by the user selection
   */
  files: PendingImportFile[];

  /**
   * The timestamp that the import job was created
   */
  createdAt: number;

  /**
   * The timestamp that the import job was updated
   */
  updatedAt?: number;
}

/**
 * The name and status of each song in the selected folder
 */
interface PendingImportFile {
  /**
   * The file name
   */
  name: string;

  /**
   * The state of the file relating to import
   */
  status: "pending" | "processing" | "done" | "error";
}

export type { PendingImportJob, PendingImportFile };