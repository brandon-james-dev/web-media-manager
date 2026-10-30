import { wmmBus } from "@/core/events";
import { notification$ } from "./notification-events";
import type { BackgroundJobState } from "./background-job-events";

// Bridges job lifecycle events on the WmmBus into UI toast notifications.
// Notifications for child jobs are intentionally skipped.
wmmBus.on("wmm.jobs.state", (evt) => {
  if (!evt) return;
  if (evt.parentJobId) return;

  const jobType = evt.jobType ?? "Job";
  const state = evt.state as BackgroundJobState;
  const message =
    (evt.payload as { message?: string } | undefined)?.message ?? "Unknown error";

  switch (evt.state) {
    case "progress":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: jobType,
        state,
        payload: evt.payload,
        title: `${jobType} started`,
        detail: "Started",
      });
      break;

    case "completed":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: jobType,
        state,
        payload: evt.payload,
        title: `${jobType} completed`,
        detail: "Finished successfully",
      });
      break;

    case "error":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: jobType,
        state,
        payload: evt.payload,
        title: `${jobType} failed`,
        detail: message,
      });
      break;

    case "canceled":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: jobType,
        state,
        payload: evt.payload,
        title: `${jobType} canceled`,
        detail: message,
      });
      break;
  }
});
