import { Timestamp } from "firebase-admin/firestore";

export interface AnalyticsEvent {
  event_id: string;
  tenant_id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  job_id: string | null;
  actor_membership_id: string | null;
  metadata: Record<string, unknown>;
  created_at: Timestamp;
}

export interface DailyMetrics {
  tenant_id: string;
  date_key: string;
  applications_created: number;
  interviews_booked: number;
  offers_sent: number;
  offers_accepted: number;
  onboarding_tasks_completed: number;
  created_at: Timestamp;
}

export interface AuditLog {
  audit_id: string;
  tenant_id: string;
  actor_membership_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: Timestamp;
}

export interface EmailTemplate {
  template_id: string;
  tenant_id: string;
  code: string;
  subject: string;
  body_html: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface CalendarConnection {
  connection_id: string;
  tenant_id: string;
  membership_id: string;
  provider: "google";
  access_token_encrypted: string;
  refresh_token_encrypted: string;
  calendar_id: string;
  status: "active" | "expired" | "revoked";
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface InterviewDoc {
  interview_id: string;
  tenant_id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  round_name: string;
  mode: "google_meet" | "in_person" | "phone";
  duration_minutes: number;
  candidate_timezone: string;
  interviewer_membership_ids: string[];
  status: "draft" | "slot_sent" | "booked" | "completed" | "cancelled" | "no_show";
  booking_token: string;
  slot_options: Array<{ start: Timestamp; end: Timestamp }>;
  scheduled_start: Timestamp | null;
  scheduled_end: Timestamp | null;
  calendar_provider: "google" | null;
  calendar_event_ref: string | null;
  feedback?: {
    rating: number;
    notes: string;
    submitted_by_membership_id: string;
    submitted_at: Timestamp;
  };
  created_at: Timestamp;
  updated_at: Timestamp;
}
