import type { PersistedJob } from "@/core/jobs";
import type { IJobStateStore } from "../IJobStateStore";
import { getWmmMusicDb, type WmmMusicDb } from "./WmmMusicDb";

export class DexieJobStateStore implements IJobStateStore {
  private readonly db: WmmMusicDb;

  constructor(db: WmmMusicDb = getWmmMusicDb()) {
    this.db = db;
  }

  async put(job: PersistedJob) {
    await this.db.jobs.put(job);
  }

  async patch(id: string, changes: Partial<PersistedJob>) {
    await this.db.jobs.update(id, changes);
  }

  async remove(id: string) {
    await this.db.jobs.delete(id);
  }

  list() {
    return this.db.jobs.toArray();
  }

  claim(id: string, expectedOwner: string, newOwner: string) {
    const { db } = this;
    return db.transaction("rw", db.jobs, async () => {
      const job = await db.jobs.get(id);
      if (!job || job.ownerId !== expectedOwner) return false;
      await db.jobs.update(id, { ownerId: newOwner, updatedAt: Date.now() });
      return true;
    });
  }
}
