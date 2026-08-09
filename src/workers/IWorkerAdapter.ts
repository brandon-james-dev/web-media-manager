import type { WorkerJob } from "@/lib/background-jobs/WorkerJob";

export interface WorkerAdapter {
  runJob(job: WorkerJob, onProgress: (msg: any) => void): Promise<any>;
  cancel(jobId: string): void;
}
