import { Timestamp } from "firebase-admin/firestore";

export type NotificationType =
  | "application_received"
  | "score_ready"
  | "stage_changed"
  | "interview_invite"
  | "interview_booked"
  | "interview_reminder"
  | "feedback_overdue"
  | "offer_sent"
  | "offer_accepted"
  | "task_due"
  | "task_overdue"
  | "trial_expiring";

export type NotificationChannel = "in_app" | "email" | "both";

export interface Notification {
  notification_id: string;
  tenant_id: string;
  recipient_membership_id: string;
  type: NotificationType;
  title: string;
  body: string;
  channel: NotificationChannel;
  read: boolean;
  entity_type: string;
  entity_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
