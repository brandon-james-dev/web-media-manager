import type { BackgroundJob } from "@/events/background-job-events";

export type JobCompletedCallback = (job: BackgroundJob) => void;

export type JobProgressCallback = (event: {
  jobId: string;
  jobType: string;
  payload: any;
}) => void;
