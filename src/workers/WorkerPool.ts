import type { WorkerJob } from "@/workers";
import type { IWorkerAdapter } from "./IWorkerAdapter";
import { eventBus } from "@/lib/background-jobs/eventBus";

export class WorkerPool {
  private workers: IWorkerAdapter[] = [];
  private busy: Set<number> = new Set();
  private queue: WorkerJob[] = [];

  constructor(createWorker: () => IWorkerAdapter, size: number) {
    for (let i = 0; i < size; i++) {
      this.workers.push(createWorker());
    }
  }

  runJob(job: WorkerJob): Promise<any> {
    return new Promise((resolve, reject) => {
      const tryDispatch = () => {
        for (let i = 0; i < this.workers.length; i++) {
          if (!this.busy.has(i)) {
            this.busy.add(i);

            this.workers[i]
              .runJob(job, (progressMsg) => {
                eventBus.next({
                  type: "jobProgress",
                  jobId: job.id,
                  jobType: job.type,
                  payload: progressMsg,
                });
              })
              .then(resolve)
              .catch((reason) => {
                eventBus.next({
                  type: "jobError",
                  jobId: job.id,
                  jobType: job.type,
                  payload: reason,
                });
                reject(reason);
              })
              .finally(() => {
                this.busy.delete(i);
                this.processQueue();
              });

            return;
          }
        }

        this.queue.push(job);
      };

      tryDispatch();
    });
  }

  private processQueue() {
    if (this.queue.length === 0) return;

    const nextJob = this.queue.shift();
    if (!nextJob) return;

    this.runJob(nextJob);
  }

  cancel(jobId: string) {
    // cancel queued jobs
    this.queue = this.queue.filter((j) => j.id !== jobId);

    // cancel running jobs
    for (const worker of this.workers) {
      worker.cancel(jobId);
    }
  }
}
