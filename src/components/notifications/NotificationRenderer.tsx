import type { AppNotificationEvent } from "@/events/notification-events";
import { BulkImportNotification } from "./BuilkImportNotification";
import { DefaultNotification } from "./DefaultNotification";

export function NotificationRenderer({
  notification,
  showTitle = true,
}: {
  notification: AppNotificationEvent;
  showTitle?: boolean;
}) {
  switch (notification.kind) {
    case "Bulk Import":
      return <BulkImportNotification notification={notification} />;

    default:
      return (
        <DefaultNotification
          notification={notification}
          showTitle={showTitle}
        />
      );
  }
}
