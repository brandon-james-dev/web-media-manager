import { NotificationRenderer } from "@/components/notifications";
import { Button } from "@/components/ui/button";
import { Item } from "@/components/ui/item";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/toast";
import {
  notification$,
  type AppNotificationEvent,
} from "@/events/notification-events";
import { Bell } from "lucide-react";
import { useState, useEffect } from "react";

function NotificationPopover() {
  const [items, setItems] = useState<AppNotificationEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const sub = notification$.subscribe((event) => {
      setItems((prev) => {
        const next = prev.filter((i) => i.id !== event.id);
        next.push(event);
        return next;
      });

      const toastId = event.parentId ?? event.id;

      if (items.findIndex((i) => i.id == toastId) === -1) {
        setUnreadCount((count) => count + 1);
      }

      toast.add({
        id: toastId,
        type: event.kind,
        data: event.payload,
        title: event.title,
        description: <NotificationRenderer notification={event} />,
      });
    });

    return () => sub.unsubscribe();
  }, [items]);

  function handleOpen(openState: boolean) {
    setUnreadCount(0);
    setOpen(openState);
  }

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger
        render={
          <Button variant="ghost" className="relative px-2">
            <Bell />

            {unreadCount > 0 && (
              <span
                className={`
                  absolute -top-1 -right-1 
                  flex items-center justify-center
                  bg-accent text-white 
                  rounded-full 
                  ${unreadCount === 1 ? "w-2 h-2" : "min-w-4 h-4 px-1 text-xs"}
                `}
              >
                {unreadCount > 1 && unreadCount}
              </span>
            )}
          </Button>
        }
      />

      <PopoverContent className="w-80 max-h-80 overflow-y-auto gap-0.5 select-none">
        <div className="flex justify-end" hidden={items.length === 0}>
          <Button size="xs" variant="outline" onClick={() => setItems([])}>
            Clear
          </Button>
        </div>
        <div hidden={items.length > 0}>
          <span>No notifications</span>
        </div>
        {items.map((n) => (
          <Item key={n.id} className="p-0.5 border-b last:border-b-0">
            <NotificationRenderer notification={n} />
          </Item>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationPopover;
