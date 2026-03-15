import type { PlanCode } from "@/modules/tenants/tenant.types";
import type { PlanFeatures } from "@/modules/plans/plan.types";
import { PLAN_FEATURES } from "@/modules/plans/plan.config";

export class PlanFeatureError extends Error {
  constructor(feature: string, currentPlan: PlanCode) {
    super(`Feature '${feature}' is not available on the '${currentPlan}' plan`);
    this.name = "PlanFeatureError";
  }
}

export function assertPlanFeature(
  planCode: PlanCode,
  feature: keyof PlanFeatures,
  featureOverrides?: Record<string, boolean>
): void {
  // Check tenant-level overrides first
  if (featureOverrides?.[feature] === true) return;

  const plan = PLAN_FEATURES[planCode];
  const value = plan[feature];

  if (typeof value === "boolean" && !value) {
    throw new PlanFeatureError(feature, planCode);
  }
}

export function getPlanFeature<K extends keyof PlanFeatures>(
  planCode: PlanCode,
  feature: K
): PlanFeatures[K] {
  return PLAN_FEATURES[planCode][feature];
}
