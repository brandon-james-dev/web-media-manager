import type { Job, PersistedJob } from "@/core/jobs";
import { getJobStateStore } from "./jobStateStore";
import { holdTabLock, isTabAlive, tabId } from "./tabSession";

holdTabLock();

const CHECKPOINT_THROTTLE_MS = 1000;

const pendingCheckpoints = new Map<
  string,
  { checkpoint: unknown; timer: ReturnType<typeof setTimeout> }
>();

function warn(action: string, error: unknown) {
  console.warn(`[jobs] could not ${action} saved job state`, error);
}

/**
 * Drop transient secrets before a payload is written to disk. Import jobs
 * carry a main-thread-resolved credential that must never be stored; it is
 * re-resolved when the job is restored.
 */
export function sanitizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const { musicSourceConfig: _secret, ...rest } = payload as Record<
    string,
    unknown
  >;
  return rest;
}

export function persistJob(job: Job): void {
  const now = Date.now();
  const resume = (job.payload as { resume?: unknown } | undefined)?.resume;
  const record: PersistedJob = {
    id: job.id,
    type: job.type,
    payload: sanitizePayload(job.payload),
    silent: job.silent,
    checkpoint: resume,
    ownerId: tabId,
    createdAt: now,
    updatedAt: now,
  };
  getJobStateStore()
    .put(record)
    .catch((error) => warn("write", error));
}

/** Save the handler's latest resume point, at most once per second per job. */
export function checkpointJob(jobId: string, checkpoint: unknown): void {
  const existing = pendingCheckpoints.get(jobId);
  if (existing) {
    existing.checkpoint = checkpoint;
    return;
  }
  const entry = {
    checkpoint,
    timer: setTimeout(() => {
      pendingCheckpoints.delete(jobId);
      getJobStateStore()
        .patch(jobId, { checkpoint: entry.checkpoint, updatedAt: Date.now() })
        .catch((error) => warn("update", error));
    }, CHECKPOINT_THROTTLE_MS),
  };
  pendingCheckpoints.set(jobId, entry);
}

export function forgetJob(jobId: string): void {
  const pending = pendingCheckpoints.get(jobId);
  if (pending) {
    clearTimeout(pending.timer);
    pendingCheckpoints.delete(jobId);
  }
  getJobStateStore()
    .remove(jobId)
    .catch((error) => warn("remove", error));
}

/**
 * Jobs left unfinished by a tab that is no longer open, claimed for this tab
 * so a second tab starting at the same moment does not restore them again.
 */
export async function takeInterruptedJobs(): Promise<PersistedJob[]> {
  const store = getJobStateStore();
  const taken: PersistedJob[] = [];
  try {
    for (const job of await store.list()) {
      if (await isTabAlive(job.ownerId)) continue;
      if (await store.claim(job.id, job.ownerId, tabId)) taken.push(job);
    }
  } catch (error) {
    warn("read", error);
  }
  return taken;
}
