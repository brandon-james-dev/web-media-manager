export type WorkerJobState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export interface WorkerJob {
  id: string;
  type: "tagWrite" | "artworkProcess" | "heavyMetadata" | "bulkImport";
  state: WorkerJobState;
  payload: any;
}

export interface WorkerProgress {
  index?: number; // current item index
  total?: number; // total items
  percent?: number; // percent of current item (0–1)
  overall?: number; // percent of entire job (0–1)
  label?: string; // human-readable description
}
