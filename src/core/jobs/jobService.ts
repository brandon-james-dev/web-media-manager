import type { BackgroundJob } from "@/events/background-job-events";

/** Same shape as lib's JobProgressCallback — declared here so the core
 *  port doesn't depend on the lib layer. */
export interface JobProgressEvent {
  jobId: string;
  jobType: string;
  payload: any;
}

/**
 * Port the application core depends on to enqueue and observe background
 * jobs.
 *
 * The high-level "enqueue a job and listen to its progress / custom events"
 * surface, distinct from the lower-level `IJobRunner.run`. Platforms supply
 * their implementation (~browser: BackgroundService over the web Worker pool)
 * via `setJobServiceProvider`, mirroring the store/source/reader ports.
 */
export interface IJobService {
  enqueue(
    job: Omit<BackgroundJob, "id" | "state">,
    jobId?: string
  ): void;
  cancelJob(jobId: string): void;
  onJobCompleted(cb: (job: BackgroundJob) => void): () => void;
  onJobProgress(cb: (event: JobProgressEvent) => void): () => void;
  onCustom(eventName: string, cb: (payload: any) => void): () => void;
}

let jobServiceProvider: (() => IJobService) | null = null;

/** Register the platform's job service before jobs are first enqueued. */
export function setJobServiceProvider(provider: () => IJobService): void {
  jobServiceProvider = provider;
}

/** Access the job service through the portable port. */
export function getJobService(): IJobService {
  if (!jobServiceProvider) {
    throw new Error(
      "[core/jobs/jobService] No job service provider registered — " +
        "call setJobServiceProvider() during bootstrap."
    );
  }
  return jobServiceProvider();
}
