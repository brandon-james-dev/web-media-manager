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

const completionId = (type: string, scope: string) => `${type}:${scope}`;

/**
 * Keep a record that a job of this type and scope just finished, under a
 * stable id so there is one row per scope. `fingerprint` identifies the
 * settings the run used.
 */
export function recordCompletion(
  type: string,
  scope: string,
  fingerprint: string
): void {
  const now = Date.now();
  getJobStateStore()
    .put({
      id: completionId(type, scope),
      type,
      payload: {},
      ownerId: tabId,
      completedAt: now,
      fingerprint,
      createdAt: now,
      updatedAt: now,
    })
    .catch((error) => warn("write", error));
}

/**
 * When a job of this type and scope last finished successfully with the same
 * fingerprint, or undefined when it never did or its setup has changed.
 */
export async function lastCompletedAt(
  type: string,
  scope: string,
  fingerprint: string
): Promise<number | undefined> {
  try {
    const record = (await getJobStateStore().list()).find(
      (job) => job.id === completionId(type, scope)
    );
    return record?.fingerprint === fingerprint ? record.completedAt : undefined;
  } catch (error) {
    warn("read", error);
    return undefined;
  }
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
      if (job.completedAt !== undefined) continue;
      if (await isTabAlive(job.ownerId)) continue;
      if (await store.claim(job.id, job.ownerId, tabId)) taken.push(job);
    }
  } catch (error) {
    warn("read", error);
  }
  return taken;
}
