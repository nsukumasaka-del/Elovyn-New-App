import { useEffect, useRef, useState } from "react";
import { Bell, Check, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/store-api";

export type AdminNotification = {
  id: string;
  type: string;
  order_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  order_number?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  total_amount?: number | string | null;
};

export function AdminNotificationBell({ onSelectOrder }: { onSelectOrder: (orderId: string) => void }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const previousUnreadRef = useRef<number | null>(null);

  const fetchNotifications = async (isPolling = false) => {
    try {
      const data = await apiRequest<{ notifications: AdminNotification[]; unread_count: number }>(
        "/admin/notifications"
      );
      setNotifications(data.notifications);

      if (isPolling && previousUnreadRef.current !== null && data.unread_count > previousUnreadRef.current) {
        const latest = data.notifications.find((n) => !n.is_read);
        if (latest) {
          toast.info(`🔔 ${latest.message}`, {
            duration: 8000,
            action: {
              label: "View",
              onClick: () => {
                onSelectOrder(latest.order_id);
                void markAsRead(latest.id);
              },
            },
          });
        }
      }

      previousUnreadRef.current = data.unread_count;
      setUnreadCount(data.unread_count);
    } catch {
      // Ignore polling errors silently
    }
  };

  useEffect(() => {
    void fetchNotifications(false);
    const interval = window.setInterval(() => {
      void fetchNotifications(true);
    }, 25_000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      await apiRequest(`/admin/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("/admin/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      toast.error("Failed to mark all as read");
    }
  };

  const handleNotificationClick = (n: AdminNotification) => {
    if (!n.is_read) void markAsRead(n.id);
    setOpen(false);
    onSelectOrder(n.order_id);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-100 transition"
        title="Admin Notifications"
        aria-label="Admin Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-neutral-900">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 hover:text-neutral-950 transition"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 divide-y divide-neutral-100 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-500">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex cursor-pointer items-start gap-3 p-4 text-xs transition hover:bg-neutral-50 ${
                      !n.is_read ? "bg-amber-50/50" : ""
                    }`}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 leading-snug">{n.message}</p>
                      <p className="mt-1 text-[11px] text-neutral-400">
                        {new Date(n.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-600" title="Unread" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
