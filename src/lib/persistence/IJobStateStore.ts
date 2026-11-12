import type { PersistedJob } from "@/core/jobs";

export interface IJobStateStore {
  put(job: PersistedJob): Promise<void>;
  patch(id: string, changes: Partial<PersistedJob>): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<PersistedJob[]>;
  /** Atomically take over a job still owned by `expectedOwner`. */
  claim(id: string, expectedOwner: string, newOwner: string): Promise<boolean>;
}
