import { Timestamp } from "firebase-admin/firestore";

export type MembershipRole = "admin" | "recruiter" | "hiring_manager";
export type MembershipStatus = "invited" | "active" | "suspended" | "removed";

export interface PermissionsOverride {
  can_view_salary?: boolean;
  can_approve_offer?: boolean;
  can_move_to_offer_stage?: boolean;
  can_edit_onboarding?: boolean;
  can_delete_jobs?: boolean;
}

export interface Membership {
  membership_id: string;
  tenant_id: string;
  user_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  permissions_override: PermissionsOverride;
  assigned_job_ids: string[];
  invited_by_membership_id: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface User {
  user_id: string;
  name: string;
  email: string;
  photo_url: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
