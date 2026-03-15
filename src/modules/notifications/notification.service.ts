import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import type {
  Notification,
  NotificationType,
  NotificationChannel,
} from "./notification.types";

interface CreateNotificationParams {
  tenantId: string;
  recipientMembershipId: string;
  type: NotificationType;
  title: string;
  body: string;
  channel?: NotificationChannel;
  entityType: string;
  entityId: string;
}

export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification> {
  const notificationId = generateId("ntf");
  const now = Timestamp.now();

  const notification: Notification = {
    notification_id: notificationId,
    tenant_id: params.tenantId,
    recipient_membership_id: params.recipientMembershipId,
    type: params.type,
    title: params.title,
    body: params.body,
    channel: params.channel ?? "in_app",
    read: false,
    entity_type: params.entityType,
    entity_id: params.entityId,
    created_at: now,
    updated_at: now,
  };

  await collections.notifications.doc(notificationId).set(notification);
  return notification;
}

export async function getNotifications(
  tenantId: string,
  membershipId: string,
  limit: number = 50
): Promise<Notification[]> {
  const snapshot = await collections.notifications
    .where("tenant_id", "==", tenantId)
    .where("recipient_membership_id", "==", membershipId)
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

export async function getUnreadCount(
  tenantId: string,
  membershipId: string
): Promise<number> {
  const snapshot = await collections.notifications
    .where("tenant_id", "==", tenantId)
    .where("recipient_membership_id", "==", membershipId)
    .where("read", "==", false)
    .get();

  return snapshot.size;
}

export async function markAsRead(
  tenantId: string,
  notificationIds: string[]
): Promise<void> {
  const batch = collections.notifications.firestore.batch();
  const now = Timestamp.now();

  for (const id of notificationIds) {
    batch.update(collections.notifications.doc(id), {
      read: true,
      updated_at: now,
    });
  }

  await batch.commit();
}
