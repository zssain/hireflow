import { Timestamp } from "firebase-admin/firestore";
import { generateId } from "@/lib/utils/ids";
import { evaluateRules } from "./rules-engine";
import type { DomainEvent, TriggerEvent } from "./automation.types";

export async function dispatchEvent(params: {
  tenantId: string;
  trigger: TriggerEvent;
  payload: Record<string, unknown>;
  actorMembershipId?: string | null;
}): Promise<string> {
  const event: DomainEvent = {
    event_id: generateId("evt"),
    tenant_id: params.tenantId,
    trigger: params.trigger,
    payload: params.payload,
    actor_membership_id: params.actorMembershipId ?? null,
    created_at: Timestamp.now(),
  };

  // Fire-and-forget rule evaluation
  evaluateRules(event).catch((err) => {
    console.error(`Rule evaluation failed for event ${event.event_id}:`, err);
  });

  return event.event_id;
}
