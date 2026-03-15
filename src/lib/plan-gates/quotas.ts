import type { PlanCode } from "@/modules/tenants/tenant.types";
import { PLAN_FEATURES } from "@/modules/plans/plan.config";
import { getUsage, type UsageField } from "@/lib/utils/usage";

export class PlanQuotaError extends Error {
  public readonly limit: number;
  public readonly current: number;

  constructor(resource: string, limit: number, current: number) {
    super(`Quota exceeded for '${resource}': ${current}/${limit}`);
    this.name = "PlanQuotaError";
    this.limit = limit;
    this.current = current;
  }
}

const QUOTA_MAP: Record<string, { usageField: UsageField; limitKey: string }> = {
  active_jobs: { usageField: "active_jobs", limitKey: "active_jobs_limit" },
  internal_users: { usageField: "internal_users", limitKey: "internal_users_limit" },
  ai_credits: { usageField: "ai_credits_used", limitKey: "ai_credits_included" },
};

export async function assertPlanQuota(
  tenantId: string,
  planCode: PlanCode,
  resource: keyof typeof QUOTA_MAP
): Promise<void> {
  const mapping = QUOTA_MAP[resource];
  if (!mapping) throw new Error(`Unknown quota resource: ${resource}`);

  const plan = PLAN_FEATURES[planCode];
  const limit = plan[mapping.limitKey as keyof typeof plan] as number;

  const usage = await getUsage(tenantId);
  const current = usage[mapping.usageField];

  if (current >= limit) {
    throw new PlanQuotaError(resource, limit, current);
  }
}
