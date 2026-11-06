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

  // Playlist phase (after the songs): set once the worker reports it.
  let playlists:
    | { completed: number; total: number; overall: number; done: boolean }
    | undefined;

  let child = {
    completed: 0,
    total: 0,
    overall: 0,
    state: "running",
  };

  const payload = notification.payload;

  // `?? 0` does NOT guard NaN (NaN is not nullish); a NaN `percent`/`overall`
  // from a 0-total progress report would flow into <Progress value={...}>
  // and render "NaN" / trigger React's "Received NaN for `value`" warning.
  const finiteProgress = (n: number | undefined | null): number =>
    Number.isFinite(n) ? (n as number) : 0;

  if (payload && typeof payload === "object" && "parent" in payload) {
    const progress = payload as BulkImportPayload;

    parent = {
      completed: progress.parent?.completed ?? 0,
      total: progress.parent?.total ?? 0,
      overall: finiteProgress(progress.parent?.overall),
      label: progress.parent?.label ?? "",
      state:
        (progress.parent?.state as BackgroundJobState) ?? notification.state,
    };

    child = {
      completed: progress.child?.completed ?? 0,
      total: progress.child?.total ?? 0,
      overall: finiteProgress(progress.child?.overall),
      state: progress.child?.state ?? "running",
    };
  } else {
    const progress = payload as ProgressPayload | undefined;

    if (progress?.data?.phase === "playlists") {
      // Songs are finished by the time playlists start.
      parent = {
        completed: 0,
        total: 0,
        overall: 1,
        label: progress.label ?? "",
        state: "completed",
      };
      playlists = {
        completed: progress.index ?? 0,
        total: progress.total ?? 0,
        overall: finiteProgress(progress.percent),
        done: Boolean(progress.data.done),
      };
    } else {
      parent = {
        completed: progress?.index ?? 0,
        total: progress?.total ?? 0,
        overall: finiteProgress(progress?.overall ?? progress?.percent),
        label: progress?.label ?? "",
        state: notification.state,
      };
    }
  }

  // The finished job's result lists the playlists it imported.
  const resultPlaylists = (payload as { playlists?: unknown[] } | undefined)
    ?.playlists;
  if (Array.isArray(resultPlaylists) && resultPlaylists.length > 0) {
    playlists = {
      completed: resultPlaylists.length,
      total: resultPlaylists.length,
      overall: 1,
      done: true,
    };
  }

  const parentComplete = parent.state === "completed";
  const importDone = notification.state === "completed";

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

        {playlists && (
          <div>
            <div className="text-xs font-medium mb-1">Importing Playlists</div>

            {playlists.done || importDone ? (
              <div className="text-xs text-muted-foreground">
                Completed
                {playlists.total > 0 &&
                  ` · ${playlists.total} ${playlists.total === 1 ? "playlist" : "playlists"}`}
              </div>
            ) : (
              <>
                <Progress value={playlists.overall * 100} />

                {playlists.total > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {playlists.completed} / {playlists.total}
                  </div>
                )}
              </>
            )}
          </div>
        )}

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
