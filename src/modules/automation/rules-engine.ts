import { collections } from "@/lib/firebase/firestore";
import { consumeUsage } from "@/lib/utils/usage";
import type { DomainEvent, WorkflowRule, RuleCondition } from "./automation.types";
import { executeAction } from "./action-executor";

export async function evaluateRules(event: DomainEvent): Promise<void> {
  const snapshot = await collections.workflowRules
    .where("tenant_id", "==", event.tenant_id)
    .where("trigger", "==", event.trigger)
    .where("enabled", "==", true)
    .get();

  if (snapshot.empty) return;

  const rules = snapshot.docs.map((doc) => doc.data());

  const tenantDoc = await collections.tenants.doc(event.tenant_id).get();
  if (!tenantDoc.exists) return;
  const tenant = tenantDoc.data()!;

  const planOrder: Record<string, number> = { starter: 0, growth: 1, pro: 2 };
  const tenantLevel = planOrder[tenant.plan_code] ?? 0;

  const eligible = rules
    .filter((r) => tenantLevel >= (planOrder[r.plan_required] ?? 0))
    .sort((a, b) => a.priority - b.priority);

  for (const rule of eligible) {
    if (!evaluateConditions(rule.conditions, event.payload)) continue;

    for (let i = 0; i < rule.actions.length; i++) {
      const key = `${event.event_id}_${rule.rule_id}_${i}`;
      const existing = await collections.ruleActionLogs.doc(key).get();
      if (existing.exists && existing.data()?.status === "success") continue;

      try {
        await executeAction(rule.actions[i], event);
        await logAction(key, event, rule, i, "success");
        await consumeUsage(event.tenant_id, "automation_runs");
      } catch (error) {
        await logAction(key, event, rule, i, "failed", error instanceof Error ? error.message : "Unknown");
      }
    }
  }
}

function evaluateConditions(conditions: RuleCondition[], payload: Record<string, unknown>): boolean {
  for (const c of conditions) {
    const val = getNestedValue(payload, c.path);
    switch (c.op) {
      case "==": if (val !== c.value) return false; break;
      case "!=": if (val === c.value) return false; break;
      case ">": if (typeof val !== "number" || val <= (c.value as number)) return false; break;
      case ">=": if (typeof val !== "number" || val < (c.value as number)) return false; break;
      case "<": if (typeof val !== "number" || val >= (c.value as number)) return false; break;
      case "<=": if (typeof val !== "number" || val > (c.value as number)) return false; break;
      case "in": if (!Array.isArray(c.value) || !c.value.includes(val)) return false; break;
      case "not_in": if (Array.isArray(c.value) && c.value.includes(val)) return false; break;
      case "contains": if (typeof val !== "string" || !val.includes(c.value as string)) return false; break;
      case "exists": if ((val != null) !== c.value) return false; break;
    }
  }
  return true;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) =>
    cur && typeof cur === "object" ? (cur as Record<string, unknown>)[key] : undefined, obj);
}

async function logAction(
  key: string, event: DomainEvent, rule: WorkflowRule, idx: number,
  status: "success" | "failed", errorMessage?: string
) {
  await collections.ruleActionLogs.doc(key).set({
    log_id: key, tenant_id: event.tenant_id, event_id: event.event_id,
    rule_id: rule.rule_id, action_index: idx, status,
    error_message: errorMessage ?? null, created_at: event.created_at,
  });
}
