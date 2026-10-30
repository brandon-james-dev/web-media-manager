import { getWorkerPool } from "@/workers";
import type { Job, IJobRunner, JobRunnerResult } from "@/core/jobs";

/**
 * Browser platform's IJobRunner: dispatches jobs to the web Worker pool.
 *
 * The WorkerPool itself reports fine-grained `progress` and `error` events to
 * `@/core/events/background-job-events`; this adapter only normalizes the outcome
 * into the contract's `JobRunnerResult` and forwards cancellations.
 */
export class BrowserJobRunner implements IJobRunner {
  private pool = getWorkerPool();

  async run(job: Job): Promise<JobRunnerResult> {
    try {
      const result = await this.pool.runJob(job);
      return { status: "completed", result };
    } catch (error) {
      return { status: "failed", error };
    }
  }

  cancel(jobId: string): void {
    this.pool.cancel(jobId);
  }
}

export const browserJobRunner: IJobRunner = new BrowserJobRunner();
