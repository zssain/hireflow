"use client";

import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useNotificationStore } from "@/stores/notification.store";
import { useApiQuery } from "@/hooks/use-api-query";
import { cn } from "@/lib/utils";

interface NotificationItem {
  notification_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const { setUnreadCount } = useNotificationStore();

  const { data: notifData, loading, refetch } = useApiQuery<{ notifications: NotificationItem[]; unread_count: number }>(
    "/notifications"
  );

  const notifications = notifData?.notifications ?? [];

  // Sync unread count when data loads
  if (notifData) {
    setUnreadCount(notifData.unread_count);
  }

  const markAllRead = async () => {
    const token = await getToken();
    if (!token || !tenantId) return;
    const unread = notifications.filter((n) => !n.read).map((n) => n.notification_id);
    if (unread.length === 0) return;
    await fetch(`/api/notifications?tenant_id=${tenantId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, notification_ids: unread }),
    });
    setUnreadCount(0);
    refetch();
  };

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="mr-2 h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.notification_id} className={cn(!n.read && "border-brand-200 bg-brand-50/30")}>
              <CardContent className="flex items-start gap-3 p-4">
                <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{n.title}</p>
                    <Badge variant="outline" className="text-xs">{n.type.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
