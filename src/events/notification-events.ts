import { Subject } from "rxjs";

export type AppNotificationEvent = {
  type: "progress" | "success" | "error" | "info";
  id: string;
  title: string;
  detail?: string;
  render?: () => React.ReactNode;
};

export const notification$ = new Subject<AppNotificationEvent>();
