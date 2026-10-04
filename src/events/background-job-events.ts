import { Subject } from "rxjs";
import type { CancellationToken } from "../lib/background-jobs/CancellationToken";
import type { WorkerJob } from "@/workers";
import type { WorkerJobType } from "@/workers/WorkerJob";

export type BackgroundJobState =
  | "started"
  | "progress"
  | "completed"
  | "error"
  | "canceled";

export interface BackgroundJob extends WorkerJob {
  token?: CancellationToken;
}

export interface BackgroundEvent {
  state: BackgroundJobState;
  jobType: WorkerJobType;
  jobId: string;
  parentJobId?: string;
  payload?: any;
}

export const eventBus = new Subject<BackgroundEvent>();
