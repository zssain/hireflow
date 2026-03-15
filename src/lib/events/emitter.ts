import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import type { TriggerEvent, DomainEvent } from "@/modules/automation/automation.types";

export interface EmitEventParams {
  tenantId: string;
  trigger: TriggerEvent;
  payload: Record<string, unknown>;
  actorMembershipId?: string | null;
}

export async function emitEvent(params: EmitEventParams): Promise<string> {
  const eventId = generateId("evt");
  const now = Timestamp.now();

  // Store analytics event
  await collections.analyticsEvents.doc(eventId).set({
    event_id: eventId,
    tenant_id: params.tenantId,
    event_type: params.trigger,
    entity_type: (params.payload.entity_type as string) ?? "",
    entity_id: (params.payload.entity_id as string) ?? "",
    job_id: (params.payload.job_id as string) ?? null,
    actor_membership_id: params.actorMembershipId ?? null,
    metadata: params.payload,
    created_at: now,
  });

  // Dispatch to workflow rules engine (fire-and-forget)
  const event: DomainEvent = {
    event_id: eventId,
    tenant_id: params.tenantId,
    trigger: params.trigger,
    payload: params.payload,
    actor_membership_id: params.actorMembershipId ?? null,
    created_at: now,
  };

  // Lazy import to avoid circular dependency
  import("@/modules/automation/rules-engine").then(({ evaluateRules }) => {
    evaluateRules(event).catch((err) => {
      console.error(`[Rules Engine] Failed for event ${eventId}:`, err);
    });
  }).catch(() => {
    // Rules engine import failed — non-fatal
  });

  return eventId;
}

export interface CreateAuditLogParams {
  tenantId: string;
  actorMembershipId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  const auditId = generateId("aud");

  await collections.auditLogs.doc(auditId).set({
    audit_id: auditId,
    tenant_id: params.tenantId,
    actor_membership_id: params.actorMembershipId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    before: params.before ?? {},
    after: params.after ?? {},
    created_at: Timestamp.now(),
  });
}
