import { eventBus, type BackgroundJob } from "./eventBus";
import { workerPool } from "@/workers";

export class BackgroundService {
  private queue: BackgroundJob[] = [];
  private running = false;

  enqueue(job: BackgroundJob) {
    this.queue.push(job);
    this.runNext();
  }

  private async runNext() {
    if (this.running) return;
    const job = this.queue.shift();
    if (!job) return;

    job.state = "running";

    this.running = true;

    eventBus.next({
      type: "jobStarted",
      jobId: job.id,
      payload: job.payload,
      jobType: job.type,
    });

    try {
      const result = await this.executeWithCancellation(job);
      eventBus.next({
        type: "jobComplete",
        jobId: job.id,
        jobType: job.type,
        payload: result,
      });
    } catch (err) {
      eventBus.next({
        type: "jobError",
        jobId: job.id,
        jobType: job.type,
        payload: err,
      });
    } finally {
      this.running = false;
      this.runNext();
    }
  }

  private async executeWithCancellation(job: BackgroundJob) {
    if (!job.token) {
      return workerPool.runJob(job);
    }

    return new Promise((resolve, reject) => {
      const sub = job.token!.onCancel$.subscribe(() => {
        job.state = "canceled";
        workerPool.cancel(job.id);
        sub.unsubscribe();
        reject(new Error("Job cancelled"));
      });

      this.execute(job)
        .then((result) => {
          if (job.state !== "canceled") {
            job.state = "completed";
          }
          resolve(result);
        })
        .catch((err) => {
          job.state = "failed";
          reject(err);
        })
        .finally(() => sub.unsubscribe());
    });
  }

  private async execute(job: BackgroundJob) {
    return workerPool.runJob(job);
  }

  cancelJob(jobId: string) {
    // Find job in queue or running
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    job.state = "canceled";

    workerPool.cancel(jobId);

    eventBus.next({
      type: "jobCanceled",
      jobId,
      jobType: job.type,
    });
  }
}

export const backgroundService = new BackgroundService();
