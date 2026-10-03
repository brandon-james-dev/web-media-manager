import { Subject } from "rxjs";
import type { CancellationToken } from "../lib/background-jobs/CancellationToken";
import type { WorkerJob } from "@/workers";
import type { WorkerJobType } from "@/workers/WorkerJob";

export interface BackgroundJob extends WorkerJob {
  token?: CancellationToken;
}

export interface BackgroundEvent {
  type:
    | "jobStarted"
    | "jobProgress"
    | "jobComplete"
    | "jobError"
    | "jobCanceled";
  jobType: WorkerJobType;
  jobId: string;
  parentJobId?: string;
  payload?: any;
}

export const eventBus = new Subject<BackgroundEvent>();
