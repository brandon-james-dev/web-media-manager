export type WorkerJobState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

export type WorkerJobType =
  | "Online Tag Write"
  | "Thumbnail Generation"
  | "Heavy Metadata"
  | "Bulk Import"
  | "Bulk Edit";

export interface WorkerJob {
  id: string;
  type: WorkerJobType;
  state: WorkerJobState;
  payload: any;
}

export interface WorkerProgress {
  data?: any; // A freeform object
  index?: number; // current item index
  total?: number; // total items
  percent?: number; // percent of current item (0–1)
  overall?: number; // percent of entire job (0–1)
  label?: string; // human-readable description
}
