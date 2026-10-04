import { ItemContent } from "@/components/ui/item";
import type { AppNotificationEvent } from "@/events/notification-events";

export function DefaultNotification({
  notification,
  showTitle = true,
}: {
  notification: AppNotificationEvent;
  showTitle: boolean;
}) {
  return (
    <ItemContent>
      {showTitle && <div className="font-medium">{notification.title}</div>}

      {notification.detail && (
        <div className="text-sm text-muted-foreground">
          {notification.detail}
        </div>
      )}
    </ItemContent>
  );
}
