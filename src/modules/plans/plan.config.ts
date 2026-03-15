import type { PlanCode } from "@/modules/tenants/tenant.types";
import type { PlanFeatures } from "./plan.types";

export const PLAN_FEATURES: Record<PlanCode, PlanFeatures> = {
  starter: {
    active_jobs_limit: 3,
    internal_users_limit: 2,
    automation_rules_limit: 3,
    advanced_analytics: false,
    custom_permissions: false,
    ai_credits_included: 50,
    email_branding: false,
    custom_workflows: false,
  },
  growth: {
    active_jobs_limit: 10,
    internal_users_limit: 5,
    automation_rules_limit: 15,
    advanced_analytics: true,
    custom_permissions: false,
    ai_credits_included: 300,
    email_branding: true,
    custom_workflows: true,
  },
  pro: {
    active_jobs_limit: 50,
    internal_users_limit: 20,
    automation_rules_limit: 100,
    advanced_analytics: true,
    custom_permissions: true,
    ai_credits_included: 1000,
    email_branding: true,
    custom_workflows: true,
  },
} as const;
