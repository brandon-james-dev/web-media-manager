import type { PersistedJob } from "@/core/jobs";
import { getMetadataDb } from "@/lib/persistence/dexie";

export interface IJobStateStore {
  put(job: PersistedJob): Promise<void>;
  patch(id: string, changes: Partial<PersistedJob>): Promise<void>;
  remove(id: string): Promise<void>;
  list(): Promise<PersistedJob[]>;
  /** Atomically take over a job still owned by `expectedOwner`. */
  claim(id: string, expectedOwner: string, newOwner: string): Promise<boolean>;
}

class DexieJobStateStore implements IJobStateStore {
  private get table() {
    return getMetadataDb().jobs;
  }

  async put(job: PersistedJob) {
    await this.table.put(job);
  }

  async patch(id: string, changes: Partial<PersistedJob>) {
    await this.table.update(id, changes);
  }

  async remove(id: string) {
    await this.table.delete(id);
  }

  list() {
    return this.table.toArray();
  }

  claim(id: string, expectedOwner: string, newOwner: string) {
    const db = getMetadataDb();
    return db.transaction("rw", db.jobs, async () => {
      const job = await db.jobs.get(id);
      if (!job || job.ownerId !== expectedOwner) return false;
      await db.jobs.update(id, { ownerId: newOwner, updatedAt: Date.now() });
      return true;
    });
  }
}

let store: IJobStateStore = new DexieJobStateStore();

export function getJobStateStore(): IJobStateStore {
  return store;
}

export function setJobStateStore(next: IJobStateStore): void {
  store = next;
}
