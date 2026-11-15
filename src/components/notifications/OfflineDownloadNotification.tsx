import type { AppNotificationEvent } from "@/events/notification-events";
import { ItemContent } from "../ui/item";
import { Progress } from "../ui/progress";

type OfflineDownloadPayload = {
  index?: number;
  total?: number;
  percent?: number;
  cached?: number;
  failed?: string[];
};

/**
 * Progress for a bulk offline download, in the same shape as the bulk import
 * notification: a labelled bar with a completed / total count, then a
 * completed line. A single-song download does not raise one.
 */
export function OfflineDownloadNotification({
  notification,
}: {
  notification: AppNotificationEvent;
}) {
  const payload = (notification.payload ?? {}) as OfflineDownloadPayload;

  // `?? 0` does not guard NaN, and a NaN would reach <Progress value>.
  const finite = (n: number | undefined): number =>
    Number.isFinite(n) ? (n as number) : 0;

  const total = finite(payload.total);
  const completed = finite(payload.index);
  const percent = finite(payload.percent) * 100;
  const done = notification.state === "completed";

  const cached = finite(payload.cached);
  const failed = payload.failed?.length ?? 0;

  return (
    <ItemContent>
      <div className="space-y-2">
        <div className="text-xs font-medium">Downloading Songs</div>

        {done ? (
          <div className="text-xs text-muted-foreground">
            Completed
            {cached > 0 && ` · ${cached} ${cached === 1 ? "song" : "songs"}`}
            {failed > 0 && ` · ${failed} failed`}
          </div>
        ) : (
          <>
            <Progress value={percent} />

            <div className="text-xs text-muted-foreground">
              {completed} / {total}
            </div>
          </>
        )}
      </div>
    </ItemContent>
  );
}
