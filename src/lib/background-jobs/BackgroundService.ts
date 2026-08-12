import { eventBus, type BackgroundJob } from "./eventBus";
import { getWorkerPool, WorkerPool } from "@/workers";

export type JobCompletedCallback = (job: BackgroundJob) => void;
export type JobProgressCallback = (event: {
  jobId: string;
  jobType: string;
  payload: any;
}) => void;

export class BackgroundService {
  private queue: BackgroundJob[] = [];
  private running = false;
  private workerPool: WorkerPool = getWorkerPool();

  private jobCompletedListeners = new Set<JobCompletedCallback>();
  private jobProgressListeners = new Set<JobProgressCallback>();

  constructor() {
    eventBus.subscribe((evt) => {
      if (evt.type === "jobProgress") {
        this.emitJobProgress({
          jobId: evt.jobId,
          jobType: evt.jobType,
          payload: evt.payload,
        });
      }
    });
  }

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
      this.emitJobCompleted({
        ...job,
        payload: result,
        state: "completed",
      });
    } catch (err) {
      eventBus.next({
        type: "jobError",
        jobId: job.id,
        jobType: job.type,
        payload: err,
      });
      this.emitJobCompleted({
        ...job,
        payload: err,
        state: "failed",
      });
    } finally {
      this.running = false;
      this.runNext();
    }
  }

  private async executeWithCancellation(job: BackgroundJob) {
    if (!job.token) {
      return this.workerPool.runJob(job);
    }

    return new Promise((resolve, reject) => {
      const sub = job.token!.onCancel$.subscribe(() => {
        job.state = "canceled";
        this.workerPool.cancel(job.id);
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
    return this.workerPool.runJob(job);
  }

  cancelJob(jobId: string) {
    // Find job in queue or running
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    job.state = "canceled";

    this.workerPool.cancel(jobId);

    eventBus.next({
      type: "jobCanceled",
      jobId,
      jobType: job.type,
    });
    this.emitJobCompleted(job);
  }

  onJobCompleted(cb: JobCompletedCallback) {
    this.jobCompletedListeners.add(cb);
    return () => {
      this.jobCompletedListeners.delete(cb);
    };
  }

  private emitJobCompleted(job: BackgroundJob) {
    for (const cb of this.jobCompletedListeners) cb(job);
  }

  onJobProgress(cb: JobProgressCallback) {
    this.jobProgressListeners.add(cb);
    return () => {
      this.jobProgressListeners.delete(cb);
    };
  }

  private emitJobProgress(event: {
    jobId: string;
    jobType: string;
    payload: any;
  }) {
    for (const cb of this.jobProgressListeners) cb(event);
  }
}

export const backgroundService = new BackgroundService();
