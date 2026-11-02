import type { BackgroundJob } from "@/events/background-job-events";
import type { WorkerProgress, WorkerJobState } from "@/workers";

export type JobCompletedCallback = (job: BackgroundJob) => void;

export type JobProgressCallback = (event: {
  jobId: string;
  jobType: string;
  payload: any;
}) => void;

export type ProgressPayload = WorkerProgress;

export type ChildAggregatePayload = {
  parent: ProgressPayload;
  child: {
    state?: WorkerJobState;
    completed?: number;
    remaining?: number;
    total?: number;
    overall?: number;
  };
};
