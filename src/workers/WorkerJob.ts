// Single source of truth for job types is `@/core/jobs`.
// Re-exported here under the historical `WorkerX` names so existing
// consumers keep compiling; the contract itself lives in the shared core.
export type {
  Job as WorkerJob,
  WorkerJobState,
  WorkerJobType,
  WorkerProgress,
} from "@/core/jobs";
