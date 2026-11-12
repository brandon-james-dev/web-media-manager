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
  "pending" | "running" | "completed" | "failed" | "canceled";

/**
 * Open string union: the closed values cover today's jobs, but the type is
 * left open so server/Tauri-defined job kinds don't force a core change.
 */
export type WorkerJobType =
  "Thumbnail Generation" | "Bulk Import" | "Bulk Edit" | (string & {});

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
  /** Resume point saved so the job can continue after a restart */
  checkpoint?: unknown;
}

export interface Job {
  id: string;
  parentJobId?: string;
  type: WorkerJobType;
  state: WorkerJobState;
  payload: any;
  /** Suppress UI notifications for this job (e.g. silent startup resyncs). */
  silent?: boolean;
}

export type JobState =
  "started" | "progress" | "completed" | "error" | "canceled";

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

/**
 * A job as saved for crash/close recovery. Holds enough to re-run the job
 * after a restart: its payload (minus transient secrets) and the latest
 * checkpoint the running handler reported.
 */
export interface PersistedJob {
  id: string;
  type: WorkerJobType;
  payload: any;
  silent?: boolean;
  /** Latest handler-reported resume point; handlers read it as `payload.resume`. */
  checkpoint?: any;
  /** Tab session that owns the job; a job is restorable once its owner is gone. */
  ownerId: string;
  /** Set on the record kept after a successful run; such a job is not restored. */
  completedAt?: number;
  /** Settings the successful run used (e.g. which folders or server). */
  fingerprint?: string;
  createdAt: number;
  updatedAt: number;
}
