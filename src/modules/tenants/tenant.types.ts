import { Timestamp } from "firebase-admin/firestore";

export type TenantStatus = "trial_active" | "active" | "suspended" | "churned";
export type PlanCode = "starter" | "growth" | "pro";

export interface Tenant {
  tenant_id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  owner_user_id: string;
  plan_code: PlanCode;
  trial_starts_at: Timestamp;
  trial_ends_at: Timestamp;
  branding: {
    logo_url: string;
    primary_color: string;
  };
  career_page: {
    enabled: boolean;
    intro: string;
    show_departments: boolean;
    show_locations: boolean;
  };
  feature_overrides: Record<string, boolean>;
  created_at: Timestamp;
  updated_at: Timestamp;
}
