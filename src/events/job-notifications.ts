import { wmmBus } from "@/events";
import { notification$ } from "./notification-events";
import type { BackgroundJobState } from "./background-job-events";

// Bridges job lifecycle events on the WmmBus into UI toast notifications.
// Notifications for child jobs are intentionally skipped.
/** True while a bulk import is in its playlist phase (after the songs). */
function isPlaylistPhase(payload: unknown): boolean {
  return (
    (payload as { data?: { phase?: string } } | undefined)?.data?.phase ===
    "playlists"
  );
}

wmmBus.on("wmm.jobs.state", (evt) => {
  if (!evt) return;
  if (evt.parentJobId) return;
  // Silent jobs (e.g. startup source resyncs) never surface notifications.
  if (evt.silent) return;
  // A device sync reports its own result — with the counts it actually wrote,
  // and only when no sync surface is on screen. Announcing it here as well
  // raised "Device Sync completed / Finished successfully" next to the real
  // result, which read as a second, wrong notification.
  if (evt.jobType === "Device Sync") return;
  // An offline download reports its own toast with the cached and failed
  // counts, so the generic "started / completed" pair would double it.
  if (evt.jobType === "Offline Download") return;
  // A removal reports its own progress bar and its own result line.
  if (evt.jobType === "Device Remove") return;
  if (evt.jobType === "Source Remove") return;

  const jobType = evt.jobType ?? "Job";
  const state = evt.state as BackgroundJobState;
  const message =
    (evt.payload as { message?: string } | undefined)?.message ??
    "Unknown error";

  switch (evt.state) {
    case "progress":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: jobType,
        state,
        payload: evt.payload,
        title: isPlaylistPhase(evt.payload)
          ? "Importing playlists"
          : `${jobType} started`,
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
