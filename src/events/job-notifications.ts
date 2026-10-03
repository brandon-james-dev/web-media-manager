import { eventBus } from "./background-job-events";
import { notification$ } from "./notification-events";

eventBus.subscribe((evt) => {
  if (evt.parentJobId) return;
  switch (evt.state) {
    case "progress":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: evt.jobType,
        state: evt.state,
        payload: evt.payload,
        title: `${evt.jobType} started`,
        detail: "Started",
      });
      break;

    case "completed":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: evt.jobType,
        state: evt.state,
        payload: evt.payload,
        title: `${evt.jobType} completed`,
        detail: "Finished successfully",
      });
      break;

    case "error":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: evt.jobType,
        state: evt.state,
        payload: evt.payload,
        title: `${evt.jobType} failed`,
        detail: evt.payload?.message ?? "Unknown error",
      });
      break;

    case "canceled":
      notification$.next({
        id: evt.jobId,
        parentId: evt.parentJobId,
        kind: evt.jobType,
        state: evt.state,
        payload: evt.payload,
        title: `${evt.jobType} canceled`,
        detail: evt.payload?.message ?? "Unknown error",
      });
      break;
  }
});
