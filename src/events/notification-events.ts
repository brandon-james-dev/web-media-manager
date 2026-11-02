import { Subject } from "rxjs";
import type { WorkerJobType } from "@/workers/WorkerJob";
import type { BackgroundJobState } from "./background-job-events";

export type AppNotificationEvent = {
  id: string;
  title: string;
  state: BackgroundJobState;
  kind: WorkerJobType | string;

  parentId?: string;
  payload?: any;
  detail?: string;
};

export const notification$ = new Subject<AppNotificationEvent>();
