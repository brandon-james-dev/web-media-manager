import type { WorkerJob } from "@/workers";

export interface IWorkerAdapter {
  runJob(job: WorkerJob, onProgress: (msg: any) => void): Promise<any>;
  cancel(jobId: string): void;
}
