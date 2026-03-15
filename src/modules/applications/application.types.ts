import { Timestamp } from "firebase-admin/firestore";

export type SourceType = "careers_page" | "manual" | "csv_import" | "referral";
export type ApplicationStatus = "active" | "rejected" | "withdrawn" | "archived" | "hired";
export type ScoreStatus = "pending" | "processing" | "processed" | "failed";
export type ParseStatus =
  | "uploaded"
  | "processing"
  | "processed"
  | "partial_success"
  | "low_confidence"
  | "failed"
  | "needs_manual_review";

export interface Application {
  application_id: string;
  tenant_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  source_type: SourceType;
  source_ref: string;
  current_stage_id: string;
  current_stage_name: string;
  status: ApplicationStatus;
  score_total: number | null;
  score_status: ScoreStatus;
  parse_status: ParseStatus;
  recruiter_owner_membership_id: string;
  hiring_manager_membership_ids: string[];
  manual_review_required: boolean;
  last_activity_at: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}
