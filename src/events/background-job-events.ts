import type { CancellationToken } from "@/lib/background-jobs/CancellationToken";
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

/**
 * Job lifecycle signal, carried on the WmmBus as the `wmm.jobs.state` event.
 * `state` may also be a runtime `custom:<name>` value for custom job events.
 */
export interface BackgroundEvent {
  state: BackgroundJobState | `custom:${string}`;
  jobType: WorkerJobType;
  jobId: string;
  parentJobId?: string;
  payload?: any;
}

