import type { MembershipRole } from "@/modules/memberships/membership.types";

export type Permission =
  | "manage_workspace"
  | "manage_team"
  | "manage_billing"
  | "create_edit_jobs"
  | "delete_jobs"
  | "view_all_candidates"
  | "move_pipeline_stages"
  | "schedule_interviews"
  | "submit_feedback"
  | "create_offers"
  | "approve_offers"
  | "send_offers"
  | "manage_onboarding"
  | "view_salary"
  | "manage_rules"
  | "view_analytics"
  | "manage_templates";

type PermissionValue = boolean | "override";

const PERMISSION_MATRIX: Record<Permission, Record<MembershipRole, PermissionValue>> = {
  manage_workspace:     { admin: true,  recruiter: false,    hiring_manager: false },
  manage_team:          { admin: true,  recruiter: false,    hiring_manager: false },
  manage_billing:       { admin: true,  recruiter: false,    hiring_manager: false },
  create_edit_jobs:     { admin: true,  recruiter: true,     hiring_manager: false },
  delete_jobs:          { admin: true,  recruiter: "override", hiring_manager: false },
  view_all_candidates:  { admin: true,  recruiter: true,     hiring_manager: false },
  move_pipeline_stages: { admin: true,  recruiter: true,     hiring_manager: "override" },
  schedule_interviews:  { admin: true,  recruiter: true,     hiring_manager: false },
  submit_feedback:      { admin: true,  recruiter: true,     hiring_manager: true },
  create_offers:        { admin: true,  recruiter: true,     hiring_manager: false },
  approve_offers:       { admin: true,  recruiter: "override", hiring_manager: "override" },
  send_offers:          { admin: true,  recruiter: true,     hiring_manager: false },
  manage_onboarding:    { admin: true,  recruiter: true,     hiring_manager: false },
  view_salary:          { admin: true,  recruiter: "override", hiring_manager: "override" },
  manage_rules:         { admin: true,  recruiter: true,     hiring_manager: false },
  view_analytics:       { admin: true,  recruiter: true,     hiring_manager: true },
  manage_templates:     { admin: true,  recruiter: true,     hiring_manager: false },
};

const OVERRIDE_MAP: Record<string, string> = {
  delete_jobs: "can_delete_jobs",
  approve_offers: "can_approve_offer",
  move_pipeline_stages: "can_move_to_offer_stage",
  view_salary: "can_view_salary",
  manage_onboarding: "can_edit_onboarding",
};

export function hasPermission(
  role: MembershipRole,
  permission: Permission,
  overrides?: Record<string, boolean>
): boolean {
  const value = PERMISSION_MATRIX[permission]?.[role];

  if (value === true) return true;
  if (value === false) return false;

  // "override" — check permissions_override
  if (value === "override" && overrides) {
    const overrideKey = OVERRIDE_MAP[permission];
    if (overrideKey && overrides[overrideKey] === true) return true;
  }

  return false;
}
