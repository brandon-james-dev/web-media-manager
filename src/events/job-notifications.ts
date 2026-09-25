import { eventBus } from "./background-job-events";
import { notification$ } from "./notification-events";

eventBus.subscribe((evt) => {
  switch (evt.type) {
    case "jobStarted":
      notification$.next({
        id: evt.jobId,
        type: "info",
        title: `${evt.jobType} started`,
        detail: "Started",
      });
      break;

    case "jobComplete":
      notification$.next({
        id: evt.jobId,
        type: "success",
        title: `${evt.jobType} completed`,
        detail: "Finished successfully",
      });
      break;

    case "jobError":
      notification$.next({
        id: evt.jobId,
        type: "error",
        title: `${evt.jobType} failed`,
        detail: evt.payload?.message ?? "Unknown error",
      });
      break;
  }
});
