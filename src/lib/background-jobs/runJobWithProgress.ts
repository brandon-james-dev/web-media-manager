import { uuidv7 } from "uuidv7";
import { getJobService } from "@/core/jobs";
import { notification$ } from "@/events/notification-events";
import type { WorkerJobType } from "@/core/jobs/types";

export interface JobRunOptions<T> {
  type: WorkerJobType;
  payload: unknown;
  /** Notification kind, used as the toast's renderer key. */
  kind: string;
  /** Title shown while the job runs. */
  title: string;
  /** Read the finished job's result into the caller's shape. */
  readResult: (result: unknown) => T;
  /**
   * Only raise a progress notification when the run covers more than one
   * item; a single removal is quick enough that a bar would flash.
   */
  bulk: boolean;
  /**
   * Called for each progress report the job emits, so a caller can mirror the
   * run into its own state without waiting for the job to finish.
   */
  onProgress?: (payload: {
    index?: number;
    total?: number;
    data?: unknown;
  }) => void;
}

/**
 * Enqueue a worker job, mirror its progress into a notification, and resolve
 * with its result.
 *
 * The job's own lifecycle events are suppressed by `job-notifications`, so
 * this is the only notification the user sees for the run: one stable id per
 * job, so each progress update replaces the last instead of stacking.
 */
export async function runJobWithProgress<T>({
  type,
  payload,
  kind,
  title,
  readResult,
  bulk,
  onProgress,
}: JobRunOptions<T>): Promise<T> {
  const jobId = uuidv7();
  const service = getJobService();
  const notificationId = `${kind}:${jobId}`;

  return await new Promise<T>((resolve, reject) => {
    const offCompleted = service.onJobCompleted((job) => {
      if (job.id !== jobId) return;

      offProgress();
      offCompleted();

      const result = readResult(job.result);

      if (bulk) {
        notification$.next({
          id: notificationId,
          kind,
          state: "completed",
          title,
          payload: {
            ...(job.result as object | undefined),
            ...(result as object | undefined),
          },
        });
      }

      resolve(result);
    });

    const offProgress = service.onJobProgress((event) => {
      if (event.jobId !== jobId) return;

      onProgress?.(event.payload ?? {});

      if (!bulk) return;

      notification$.next({
        id: notificationId,
        kind,
        state: "progress",
        title,
        payload: event.payload,
      });
    });

    try {
      service.enqueue({ type, payload } as never, jobId);
    } catch (error) {
      offProgress();
      offCompleted();
      reject(error);
    }
  });
}
