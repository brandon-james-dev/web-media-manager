interface PendingImportJob {
  id?: number;
  directoryHandle: FileSystemDirectoryHandle;
  files: PendingImportFile[];
  createdAt: number;
  updatedAt?: number;
}

interface PendingImportFile {
  name: string;
  status: "pending" | "processing" | "done" | "error";
}

export type { PendingImportJob, PendingImportFile };