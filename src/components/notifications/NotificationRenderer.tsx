import type { AppNotificationEvent } from "@/events/notification-events";
import { BulkImportNotification } from "./BuilkImportNotification";
import { DefaultNotification } from "./DefaultNotification";
import { OfflineDownloadNotification } from "./OfflineDownloadNotification";
import { RemovalNotification } from "./RemovalNotification";

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

    case "Offline Download":
      return <OfflineDownloadNotification notification={notification} />;

    case "Device Remove":
    case "Source Remove":
      return <RemovalNotification notification={notification} />;

    default:
      return (
        <DefaultNotification
          notification={notification}
          showTitle={showTitle}
        />
      );
  }
}
