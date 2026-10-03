import { uuidv7 } from "uuidv7";
import { Subject } from "rxjs";
import { eventBus, type BackgroundJob } from "@/events/background-job-events";
import { getWorkerPool, WorkerPool } from "@/workers";
import type { JobCompletedCallback, JobProgressCallback } from "./callbacks";

export class BackgroundService {
  private queue: BackgroundJob[] = [];
  private running = false;
  private workerPool: WorkerPool = getWorkerPool();

  private jobCompletedListeners = new Set<JobCompletedCallback>();
  private jobProgressListeners = new Set<JobProgressCallback>();

  private customEventBus = new Subject<{
    eventName: string;
    payload: any;
  }>();

  private childMap = new Map<string, Set<string>>();
  private waitingParents = new Map<string, BackgroundJob>();

  constructor() {
    eventBus.subscribe((evt) => {
      // Ignore child job notifications entirely
      if (evt.parentJobId) return;

      if (evt.type === "jobProgress") {
        this.emitJobProgress({
          jobId: evt.jobId,
          jobType: evt.jobType,
          payload: evt.payload,
        });
      }

      if (evt.type?.startsWith("custom:")) {
        const eventName = evt.type.substring("custom:".length);
        this.emitCustom(eventName, evt.payload);
      }
    });
  }

  emitCustom(eventName: string, payload: any) {
    this.customEventBus.next({ eventName, payload });
  }

  onCustom(eventName: string, cb: (payload: any) => void) {
    const sub = this.customEventBus.subscribe((evt) => {
      if (evt.eventName === eventName) cb(evt.payload);
    });
    return () => sub.unsubscribe();
  }

  enqueue(job: Omit<BackgroundJob, "id" | "state">, jobId: string = uuidv7()) {
    const fullJob: BackgroundJob = {
      state: "pending",
      ...job,
      id: jobId,
    };

    // If this job has a parent, register it
    if (fullJob.parentJobId) {
      if (!this.childMap.has(fullJob.parentJobId)) {
        this.childMap.set(fullJob.parentJobId, new Set());
      }
      this.childMap.get(fullJob.parentJobId)!.add(fullJob.id);
    }

    this.queue.push(fullJob);
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
      parentJobId: job.parentJobId,
    });

    try {
      const result = await this.executeWithCancellation(job);

      this.handleCompletion(job, undefined, result);
    } catch (err) {
      this.handleCompletion(job, err);
    } finally {
      this.running = false;
      this.runNext();
    }
  }

  private handleCompletion(job: BackgroundJob, error?: any, result?: any) {
    job.state = error ? "failed" : "completed";

    // Child job
    if (job.parentJobId) {
      const parentId = job.parentJobId;
      const children = this.childMap.get(parentId);

      if (children) {
        children.delete(job.id);

        eventBus.next({
          type: "jobProgress",
          jobId: parentId,
          jobType: "Bulk Import",
          payload: {
            completed: [...children].length === 0 ? 100 : undefined,
            remaining: children.size,
          },
        });

        if (children.size === 0) {
          this.childMap.delete(parentId);

          const parentJob = this.waitingParents.get(parentId);

          if (parentJob) {
            this.waitingParents.delete(parentId);

            eventBus.next({
              type: "jobComplete",
              jobId: parentJob.id,
              jobType: parentJob.type,
              payload: result,
            });

            this.emitJobCompleted(parentJob);
          }
        }
      }

      return;
    }

    // Parent job with children still running
    const children = this.childMap.get(job.id);

    if (children && children.size > 0) {
      this.waitingParents.set(job.id, job);
      return;
    }

    // Normal completion

    eventBus.next({
      type: "jobComplete",
      jobId: job.id,
      jobType: job.type,
      payload: result,
    });

    this.emitJobCompleted(job);
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
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    job.state = "canceled";
    this.workerPool.cancel(jobId);

    eventBus.next({
      type: "jobCanceled",
      jobId,
      jobType: job.type,
      parentJobId: job.parentJobId,
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
