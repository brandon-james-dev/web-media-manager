import type { AppNotificationEvent } from "@/events/notification-events";
import { ItemContent } from "../ui/item";
import { Progress } from "../ui/progress";
import type { ProgressPayload } from "@/lib/background-jobs/callbacks";
import type { BackgroundJobState } from "@/events/background-job-events";

type BulkImportPayload = {
  parent?: {
    state?: string;
    label?: string;
    overall?: number;
    completed?: number;
    total?: number;
  };

  child?: {
    state?: string;
    completed?: number;
    remaining?: number;
    total?: number;
    overall?: number;
  };
};

export function BulkImportNotification({
  notification,
}: {
  notification: AppNotificationEvent;
}) {
  let parent = {
    completed: 0,
    total: 0,
    overall: 0,
    label: "",
    state: notification.state,
  };

  let child = {
    completed: 0,
    total: 0,
    overall: 0,
    state: "running",
  };

  const payload = notification.payload;

  if (payload && typeof payload === "object" && "parent" in payload) {
    const progress = payload as BulkImportPayload;

    parent = {
      completed: progress.parent?.completed ?? 0,
      total: progress.parent?.total ?? 0,
      overall: progress.parent?.overall ?? 0,
      label: progress.parent?.label ?? "",
      state:
        (progress.parent?.state as BackgroundJobState) ?? notification.state,
    };

    child = {
      completed: progress.child?.completed ?? 0,
      total: progress.child?.total ?? 0,
      overall: progress.child?.overall ?? 0,
      state: progress.child?.state ?? "running",
    };
  } else {
    const progress = payload as ProgressPayload | undefined;

    parent = {
      completed: progress?.index ?? 0,
      total: progress?.total ?? 0,
      overall: progress?.overall ?? progress?.percent ?? 0,
      label: progress?.label ?? "",
      state: notification.state,
    };
  }

  const parentComplete = parent.state === "completed";

  const childComplete = child.completed === child.total;

  return (
    <ItemContent>
      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium mb-1">Importing Songs</div>

          {parentComplete ? (
            <div className="text-xs text-muted-foreground">Completed</div>
          ) : (
            <>
              <Progress value={parent.overall * 100} />

              <div className="text-xs text-muted-foreground mt-1">
                {parent.total > 0 && (
                  <span className="block">
                    {parent.completed} / {parent.total}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {child.total > 0 && (
          <div>
            <div className="text-xs font-medium mb-1">
              Generating Thumbnails
            </div>

            {childComplete ? (
              <div className="text-xs text-muted-foreground">Completed</div>
            ) : (
              <>
                <Progress value={child.overall * 100} />

                <div className="text-xs text-muted-foreground mt-1">
                  {child.completed} / {child.total}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </ItemContent>
  );
}
