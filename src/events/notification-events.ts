import { Subject } from "rxjs";
import type { WorkerJobType } from "@/workers/WorkerJob";
import type { BackgroundJobState } from "./background-job-events";

export type AppNotificationEvent = {
  id: string;
  parentId?: string;

  payload?: any;
  title: string;
  detail?: string;

  state: BackgroundJobState;
  kind: WorkerJobType;
};

export const notification$ = new Subject<AppNotificationEvent>();
