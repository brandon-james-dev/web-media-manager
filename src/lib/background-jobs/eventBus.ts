import { Subject } from "rxjs";
import type { CancellationToken } from "./CancellationToken";
import type { WorkerJob } from "@/workers";

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
  jobType: WorkerJob["type"];
  jobId: string;
  payload?: any;
}

export const eventBus = new Subject<BackgroundEvent>();
