import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { markNotificationReadSchema } from "@/lib/validators/schemas";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
} from "@/modules/notifications/notification.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const [notifications, unreadCount] = await Promise.all([
      getNotifications(auth.tenantId, auth.membership.membership_id),
      getUnreadCount(auth.tenantId, auth.membership.membership_id),
    ]);

    return NextResponse.json({ notifications, unread_count: unreadCount });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const body = await req.json();
    const parsed = markNotificationReadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await markAsRead(auth.tenantId, parsed.data.notification_ids);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
