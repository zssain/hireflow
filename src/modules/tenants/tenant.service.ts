import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import { daysFromNow } from "@/lib/utils/dates";
import type { Tenant, PlanCode } from "./tenant.types";
import type { Subscription } from "@/modules/plans/plan.types";
import type { Membership } from "@/modules/memberships/membership.types";
import type { PipelineTemplate } from "@/modules/jobs/job.types";
import type { WorkflowRule } from "@/modules/automation/automation.types";

interface CreateTenantParams {
  companyName: string;
  slug: string;
  ownerUserId: string;
}

interface CreateTenantResult {
  tenant: Tenant;
  membership: Membership;
  subscription: Subscription;
}

export async function createTenant(params: CreateTenantParams): Promise<CreateTenantResult> {
  // Check slug uniqueness
  const slugCheck = await collections.tenants
    .where("slug", "==", params.slug)
    .limit(1)
    .get();

  if (!slugCheck.empty) {
    throw new Error("Slug already taken");
  }

  const tenantId = generateId("tn");
  const membershipId = generateId("mb");
  const now = Timestamp.now();
  const trialEnd = daysFromNow(14);

  const tenant: Tenant = {
    tenant_id: tenantId,
    name: params.companyName,
    slug: params.slug,
    status: "trial_active",
    owner_user_id: params.ownerUserId,
    plan_code: "starter",
    trial_starts_at: now,
    trial_ends_at: trialEnd,
    branding: {
      logo_url: "",
      primary_color: "#2563eb",
    },
    career_page: {
      enabled: false,
      intro: "",
      show_departments: true,
      show_locations: true,
    },
    feature_overrides: {},
    created_at: now,
    updated_at: now,
  };

  const membership: Membership = {
    membership_id: membershipId,
    tenant_id: tenantId,
    user_id: params.ownerUserId,
    role: "admin",
    status: "active",
    permissions_override: {},
    assigned_job_ids: [],
    invited_by_membership_id: null,
    created_at: now,
    updated_at: now,
  };

  const subscription: Subscription = {
    tenant_id: tenantId,
    plan_code: "starter",
    billing_state: "trial",
    status: "active",
    renewal_interval: "monthly",
    current_period_start: now,
    current_period_end: trialEnd,
    cancel_at_period_end: false,
    created_at: now,
    updated_at: now,
  };

  // Default pipeline template
  const templateId = generateId("pt");
  const defaultTemplate: PipelineTemplate = {
    template_id: templateId,
    tenant_id: tenantId,
    name: "Default Pipeline",
    stages: [
      { stage_id: "applied", name: "Applied", order: 0 },
      { stage_id: "screening", name: "Screening", order: 1 },
      { stage_id: "interview", name: "Interview", order: 2 },
      { stage_id: "offer", name: "Offer", order: 3 },
      { stage_id: "hired", name: "Hired", order: 4 },
    ],
    created_at: now,
    updated_at: now,
  };

  // Default workflow rules
  const defaultRules: Array<Omit<WorkflowRule, "rule_id" | "created_at" | "updated_at">> = [
    {
      tenant_id: tenantId, name: "Notify recruiter when score ready",
      enabled: true, priority: 10, trigger: "application.processing_completed",
      conditions: [], plan_required: "starter",
      actions: [{ type: "create_notification", params: { target: "recruiter_owner", type: "score_ready" } }],
    },
    {
      tenant_id: tenantId, name: "Auto-shortlist strong candidates",
      enabled: true, priority: 20, trigger: "application.processing_completed",
      conditions: [{ path: "score_total", op: ">=", value: 80 }], plan_required: "growth",
      actions: [
        { type: "move_stage", params: { stage_id: "screening" } },
        { type: "create_notification", params: { target: "recruiter_owner", type: "score_ready" } },
      ],
    },
    {
      tenant_id: tenantId, name: "Create onboarding on offer accepted",
      enabled: true, priority: 10, trigger: "offer.accepted",
      conditions: [], plan_required: "starter",
      actions: [{ type: "create_onboarding_plan", params: { template: "default" } }],
    },
    {
      tenant_id: tenantId, name: "Remind overdue onboarding tasks",
      enabled: true, priority: 10, trigger: "onboarding.task.overdue",
      conditions: [], plan_required: "starter",
      actions: [{ type: "remind_assignee", params: {} }],
    },
  ];

  // Batch write
  const batch = collections.tenants.firestore.batch();
  batch.set(collections.tenants.doc(tenantId), tenant);
  batch.set(collections.memberships.doc(membershipId), membership);
  batch.set(collections.subscriptions.doc(tenantId), subscription);
  batch.set(collections.pipelineTemplates.doc(templateId), defaultTemplate);

  for (const rule of defaultRules) {
    const ruleId = generateId("rl");
    batch.set(collections.workflowRules.doc(ruleId), {
      rule_id: ruleId, ...rule, created_at: now, updated_at: now,
    } as WorkflowRule);
  }

  await batch.commit();

  return { tenant, membership, subscription };
}

export async function getTenant(tenantId: string): Promise<Tenant | null> {
  const doc = await collections.tenants.doc(tenantId).get();
  return doc.exists ? doc.data()! : null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const snapshot = await collections.tenants
    .where("slug", "==", slug)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0].data();
}

export async function updateTenantSettings(
  tenantId: string,
  updates: Record<string, unknown>
): Promise<void> {
  await collections.tenants.doc(tenantId).update({
    ...updates,
    updated_at: Timestamp.now(),
  });
}
