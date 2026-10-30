/**
 * Transport-neutral job contract for background work.
 *
 * Shared by every platform (browser, Tauri, server). Describes *what* a job
 * is and how its progress/state is reported, independent of *how* it runs
 * (browser Worker pool, Rust command, Node process). Each platform supplies
 * a JobRunner adapter that executes a defined job.
 *
 * Derived from `src/lib/background-jobs` / `src/workers/WorkerJob`, but
 * stripped of the browser-only WorkerPool and kept free of RxJS.
 */

export type WorkerJobState =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "canceled";

/**
 * Open string union: the closed values cover today's jobs, but the type is
 * left open so server/Tauri-defined job kinds don't force a core change.
 */
export type WorkerJobType =
  | "Online Tag Write"
  | "Thumbnail Generation"
  | "Heavy Metadata"
  | "Bulk Import"
  | "Bulk Edit"
  | (string & {});

export interface WorkerProgress {
  /** A freeform object */
  data?: any;
  /** Current item index */
  index?: number;
  /** Total items */
  total?: number;
  /** Percent of current item (0-1) */
  percent?: number;
  /** Percent of entire job (0-1) */
  overall?: number;
  /** Human-readable description */
  label?: string;
}

export interface Job {
  id: string;
  parentJobId?: string;
  type: WorkerJobType;
  state: WorkerJobState;
  payload: any;
}

export type JobState =
  | "started"
  | "progress"
  | "completed"
  | "error"
  | "canceled";

export interface JobEvent {
  state: JobState;
  jobType: WorkerJobType;
  jobId: string;
  parentJobId?: string;
  payload?: any;
}

/** Transport-neutral cancellation signal (not tied to RxJS). */
export interface JobCancellationToken {
  readonly isCancelled: () => boolean;
  onCancel(callback: () => void): () => void;
}
