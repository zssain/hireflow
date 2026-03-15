import { Timestamp } from "firebase-admin/firestore";
import type { PlanCode } from "@/modules/tenants/tenant.types";

export type BillingState = "trial" | "active" | "past_due" | "cancelled";
export type RenewalInterval = "monthly" | "yearly";

export interface Subscription {
  tenant_id: string;
  plan_code: PlanCode;
  billing_state: BillingState;
  status: "active" | "inactive";
  renewal_interval: RenewalInterval;
  current_period_start: Timestamp;
  current_period_end: Timestamp;
  cancel_at_period_end: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface UsageCounter {
  tenant_id: string;
  period_key: string;
  active_jobs: number;
  internal_users: number;
  candidate_applications: number;
  emails_sent: number;
  automation_runs: number;
  ai_credits_used: number;
  ai_credits_included: number;
  ai_credits_extra: number;
  updated_at: Timestamp;
}

export interface PlanFeatures {
  active_jobs_limit: number;
  internal_users_limit: number;
  automation_rules_limit: number;
  advanced_analytics: boolean;
  custom_permissions: boolean;
  ai_credits_included: number;
  email_branding: boolean;
  custom_workflows: boolean;
}
