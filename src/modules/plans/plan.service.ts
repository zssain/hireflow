import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import type { PlanCode } from "@/modules/tenants/tenant.types";
import type { Subscription } from "./plan.types";
import { PLAN_FEATURES } from "./plan.config";

export async function getSubscription(tenantId: string): Promise<Subscription | null> {
  const doc = await collections.subscriptions.doc(tenantId).get();
  return doc.exists ? doc.data()! : null;
}

export async function upgradePlan(tenantId: string, newPlan: PlanCode): Promise<void> {
  const now = Timestamp.now();

  await collections.subscriptions.doc(tenantId).update({
    plan_code: newPlan,
    billing_state: "active",
    updated_at: now,
  });

  await collections.tenants.doc(tenantId).update({
    plan_code: newPlan,
    status: "active",
    updated_at: now,
  });
}

export async function cancelSubscription(tenantId: string): Promise<void> {
  await collections.subscriptions.doc(tenantId).update({
    cancel_at_period_end: true,
    updated_at: Timestamp.now(),
  });
}

export function getPlanLimits(planCode: PlanCode) {
  return PLAN_FEATURES[planCode];
}

export async function checkTrialExpiry(tenantId: string): Promise<boolean> {
  const tenant = await collections.tenants.doc(tenantId).get();
  if (!tenant.exists) return false;

  const data = tenant.data()!;
  if (data.status !== "trial_active") return false;

  return data.trial_ends_at.toDate() < new Date();
}
