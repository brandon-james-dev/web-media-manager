import type { Job } from "./types";

export interface JobRunnerResult {
  status: "completed" | "failed";
  result?: any;
  error?: unknown;
}

/**
 * Port for executing a background job.
 *
 * Transport-neutral contract: platforms supply their own executor.
 *  - Browser: `WorkerPool` (web workers)
 *  - Tauri:   in-webview workers, or a Rust command for heavy per-file work
 *  - Server:  in-process queue / child process / Piscina pool
 *
 * Progress and completion events flow back via the platform's own event
 * mechanism (see `src/core/events`), not through this interface.
 */
export interface IJobRunner {
  run(job: Job): Promise<JobRunnerResult>;
  cancel(jobId: string): void;
}
