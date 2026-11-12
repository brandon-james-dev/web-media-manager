import { uuidv7 } from "uuidv7";
import { Subject } from "rxjs";
import { type BackgroundJob } from "@/events/background-job-events";
import { wmmBus } from "@/events";
import {
  type IJobRunner,
  JobProgressAggregator,
  type WorkerProgress,
} from "@/core/jobs";
import { browserJobRunner } from "./BrowserJobRunner";
import { sourceFingerprint } from "@/lib/sources/sourceFingerprint";
import {
  checkpointJob,
  forgetJob,
  lastCompletedAt,
  persistJob,
  recordCompletion,
} from "./jobPersistence";
import type {
  JobCompletedCallback,
  JobProgressCallback,
  ProgressPayload,
} from "./callbacks";

export class BackgroundService {
  private queue: BackgroundJob[] = [];
  private running = false;
  private current?: BackgroundJob;
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

    // Jobs lifecycle rides the WmmBus as `wmm.jobs.state`. Keep this
    // internal subscription in sync with the publishes in this file.
    wmmBus.on("wmm.jobs.state", (evt) => {
      if (!evt) return;
      // Ignore child job notifications entirely
      if (evt.parentJobId) return;

      if (evt.state === "progress") {
        const checkpoint = (evt.payload as { checkpoint?: unknown } | undefined)
          ?.checkpoint;
        if (checkpoint !== undefined) checkpointJob(evt.jobId, checkpoint);
        this.emitJobProgress({
          jobId: evt.jobId,
          jobType: evt.jobType ?? "",
          payload: evt.payload as WorkerProgress,
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
    if (job.type === "Bulk Import" && !job.parentJobId) {
      const sourceId = job.payload?.musicSource?.id;
      const duplicate = [...this.queue, this.current].find(
        (j) =>
          j?.type === "Bulk Import" &&
          sourceId !== undefined &&
          j.payload?.musicSource?.id === sourceId &&
          j.state !== "canceled"
      );
      if (duplicate) return duplicate.id;
    }

    const fullJob: BackgroundJob = {
      state: "pending",
      ...job,
      id: jobId,
    };

    // If this job has a parent, register it
    if (fullJob.parentJobId) {
      this.aggregator.registerChild(fullJob.parentJobId, fullJob.id);
    }

    if (!fullJob.parentJobId) persistJob(fullJob);

    this.queue.push(fullJob);
    this.runNext();
    return fullJob.id;
  }

  private async runNext() {
    if (this.running) return;

    const job = this.queue.shift();
    if (!job) return;

    job.state = "running";
    this.running = true;
    this.current = job;

    wmmBus.publish("wmm.jobs.state", {
      state: "started",
      jobId: job.id,
      payload: job.payload,
      jobType: job.type,
      parentJobId: job.parentJobId,
      silent: job.silent,
    });

    try {
      await this.addImportSince(job);
      const result = await this.execute(job);
      this.handleCompletion(job, undefined, result);
    } catch (err) {
      this.handleCompletion(job, err);
    } finally {
      this.running = false;
      this.current = undefined;
      this.runNext();
    }
  }

  private async addImportSince(job: BackgroundJob) {
    const source = job.payload?.musicSource;
    if (job.type !== "Bulk Import" || job.parentJobId || !source) return;
    const since = await lastCompletedAt(
      job.type,
      source.id,
      sourceFingerprint(source)
    );
    if (since !== undefined) job.payload = { ...job.payload, since };
  }

  private handleCompletion(job: BackgroundJob, error?: any, result?: any) {
    job.state = error ? "failed" : "completed";

    const source = job.payload?.musicSource;
    if (
      !error &&
      !result?.cancelled &&
      job.type === "Bulk Import" &&
      !job.parentJobId &&
      source
    ) {
      recordCompletion(job.type, source.id, sourceFingerprint(source));
    }

    // Child job: aggregate progress under its parent.
    if (job.parentJobId) {
      const { aggregate, parentDone } = this.aggregator.completeChild(
        job.parentJobId,
        job.id,
        job.state
      );

      const parent = this.aggregator.parentOf(job.parentJobId);

      wmmBus.publish("wmm.jobs.state", {
        state: "progress",
        jobId: job.parentJobId,
        jobType: parent?.type ?? job.type,
        silent: parent?.silent ?? job.silent,
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
    wmmBus.publish("wmm.jobs.state", {
      state: "completed",
      jobId: job.id,
      jobType: job.type,
      payload: result,
      silent: job.silent,
    });

    this.emitJobCompleted(job);
  }

  private async execute(job: BackgroundJob) {
    const result = await this.runner.run(job);
    if (result.status === "failed") throw result.error;
    return result.result;
  }

  cancelJob(jobId: string) {
    forgetJob(jobId);
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    job.state = "canceled";
    this.runner.cancel(jobId);

    wmmBus.publish("wmm.jobs.state", {
      state: "canceled",
      jobId,
      jobType: job.type,
      parentJobId: job.parentJobId,
      silent: job.silent,
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
    if (!job.parentJobId) forgetJob(job.id);
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
