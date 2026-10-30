import { uuidv7 } from "uuidv7";
import { Subject } from "rxjs";
import { eventBus, type BackgroundJob } from "@/events/background-job-events";
import { type IJobRunner } from "@/core/jobs";
import { JobProgressAggregator } from "@/core/jobs";
import { browserJobRunner } from "./BrowserJobRunner";
import type {
  JobCompletedCallback,
  JobProgressCallback,
  ProgressPayload,
} from "./callbacks";

export class BackgroundService {
  private queue: BackgroundJob[] = [];
  private running = false;
  private runner: IJobRunner;

  private jobCompletedListeners = new Set<JobCompletedCallback>();
  private jobProgressListeners = new Set<JobProgressCallback>();

  private customEventBus = new Subject<{
    eventName: string;
    payload: any;
  }>();

  private aggregator = new JobProgressAggregator();

  constructor(runner: IJobRunner = browserJobRunner) {
    this.runner = runner;

    eventBus.subscribe((evt) => {
      // Ignore child job notifications entirely
      if (evt.parentJobId) return;

      if (evt.state === "progress") {
        this.emitJobProgress({
          jobId: evt.jobId,
          jobType: evt.jobType,
          payload: evt.payload,
        });
      }

      if (evt.state?.startsWith("custom:")) {
        const eventName = evt.state.substring("custom:".length);
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
      this.aggregator.registerChild(fullJob.parentJobId, fullJob.id);
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
      state: "started",
      jobId: job.id,
      payload: job.payload,
      jobType: job.type,
      parentJobId: job.parentJobId,
    });

    try {
      const result = await this.execute(job);
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

    // Child job: aggregate progress under its parent.
    if (job.parentJobId) {
      const { aggregate, parentDone } = this.aggregator.completeChild(
        job.parentJobId,
        job.id,
        job.state
      );

      const parent = this.aggregator.parentOf(job.parentJobId);

      eventBus.next({
        state: "progress",
        jobId: job.parentJobId,
        jobType: parent?.type ?? job.type,
        payload: parentDone
          ? {
              parent: {
                ...aggregate.parent,
                state: "completed",
              },
              child: aggregate.child,
            }
          : aggregate,
      });

      if (parentDone && parent) {
        this.aggregator.release(job.parentJobId);
        this.emitJobCompleted(parent);
      }
      return;
    }

    // Parent job with children still running
    if (this.aggregator.hasChildren(job.id)) {
      this.aggregator.setWaitingParent(job);
      return;
    }

    // Normal completion
    eventBus.next({
      state: "completed",
      jobId: job.id,
      jobType: job.type,
      payload: result,
    });

    this.emitJobCompleted(job);
  }

  private async execute(job: BackgroundJob) {
    const result = await this.runner.run(job);
    if (result.status === "failed") throw result.error;
    return result.result;
  }

  cancelJob(jobId: string) {
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    job.state = "canceled";
    this.runner.cancel(jobId);

    eventBus.next({
      state: "canceled",
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
    payload: ProgressPayload;
  }) {
    for (const cb of this.jobProgressListeners) cb(event);
  }
}

export const backgroundService = new BackgroundService();
