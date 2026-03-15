import { collections } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { createNotification } from "@/modules/notifications/notification.service";
import { sendEmail, renderTemplate } from "@/lib/adapters/email.adapter";
import { consumeUsage } from "@/lib/utils/usage";
import type { RuleAction, DomainEvent } from "./automation.types";

export async function executeAction(action: RuleAction, event: DomainEvent): Promise<void> {
  switch (action.type) {
    case "move_stage":
      await handleMoveStage(action.params, event);
      break;
    case "create_notification":
      await handleCreateNotification(action.params, event);
      break;
    case "send_email_template":
      await handleSendEmail(action.params, event);
      break;
    case "assign_owner":
      await handleAssignOwner(action.params, event);
      break;
    case "create_onboarding_plan":
      // Handled via the onboarding service when offer.accepted fires
      break;
    case "mark_flag":
      await handleMarkFlag(action.params, event);
      break;
    case "set_field":
      await handleSetField(action.params, event);
      break;
    case "create_task":
      // Would create an onboarding task
      break;
    case "remind_assignee":
      await handleRemindAssignee(action.params, event);
      break;
  }
}

async function handleMoveStage(params: Record<string, unknown>, event: DomainEvent) {
  const applicationId = event.payload.entity_id as string;
  const stageId = params.stage_id as string;
  if (!applicationId || !stageId) return;

  await collections.applications.doc(applicationId).update({
    current_stage_id: stageId,
    updated_at: Timestamp.now(),
  });
}

async function handleCreateNotification(params: Record<string, unknown>, event: DomainEvent) {
  const target = params.target as string;
  const type = params.type as string;

  let recipientMembershipId = "";

  if (target === "recruiter_owner") {
    const appId = event.payload.entity_id as string ?? event.payload.application_id as string;
    if (appId) {
      const appDoc = await collections.applications.doc(appId).get();
      if (appDoc.exists) {
        recipientMembershipId = appDoc.data()!.recruiter_owner_membership_id;
      }
    }
  }

  if (!recipientMembershipId) return;

  await createNotification({
    tenantId: event.tenant_id,
    recipientMembershipId,
    type: type as "score_ready" | "application_received" | "stage_changed",
    title: `${type.replace(/_/g, " ")}`,
    body: `Event: ${event.trigger}`,
    entityType: event.payload.entity_type as string ?? "application",
    entityId: event.payload.entity_id as string ?? "",
  });
}

async function handleSendEmail(params: Record<string, unknown>, event: DomainEvent) {
  const templateCode = params.template_code as string;
  if (!templateCode) return;

  const templateSnap = await collections.emailTemplates
    .where("tenant_id", "==", event.tenant_id)
    .where("code", "==", templateCode)
    .limit(1)
    .get();

  if (templateSnap.empty) return;

  const template = templateSnap.docs[0].data();
  const candidateEmail = event.payload.candidate_email as string;
  if (!candidateEmail) return;

  const variables = Object.fromEntries(
    Object.entries(event.payload)
      .filter(([, v]) => typeof v === "string")
      .map(([k, v]) => [k, v as string])
  );

  const html = renderTemplate(template.body_html, variables);
  await sendEmail({ to: candidateEmail, subject: template.subject, html });
  await consumeUsage(event.tenant_id, "emails_sent");
}

async function handleAssignOwner(params: Record<string, unknown>, event: DomainEvent) {
  const membershipId = params.membership_id as string;
  const applicationId = event.payload.entity_id as string;
  if (!membershipId || !applicationId) return;

  await collections.applications.doc(applicationId).update({
    recruiter_owner_membership_id: membershipId,
    updated_at: Timestamp.now(),
  });
}

async function handleMarkFlag(params: Record<string, unknown>, event: DomainEvent) {
  const field = params.field as string;
  const value = params.value;
  const applicationId = event.payload.entity_id as string;
  if (!field || !applicationId) return;

  await collections.applications.doc(applicationId).update({
    [field]: value,
    updated_at: Timestamp.now(),
  });
}

async function handleSetField(params: Record<string, unknown>, event: DomainEvent) {
  const field = params.field as string;
  const value = params.value;
  const applicationId = event.payload.entity_id as string;
  if (!field || !applicationId) return;

  await collections.applications.doc(applicationId).update({
    [field]: value,
    updated_at: Timestamp.now(),
  });
}

async function handleRemindAssignee(params: Record<string, unknown>, event: DomainEvent) {
  const entityId = event.payload.entity_id as string;
  if (!entityId) return;

  const taskDoc = await collections.onboardingTasks.doc(entityId).get();
  if (!taskDoc.exists) return;
  const task = taskDoc.data()!;

  if (task.assigned_membership_id) {
    await createNotification({
      tenantId: event.tenant_id,
      recipientMembershipId: task.assigned_membership_id,
      type: "task_overdue",
      title: `Overdue: ${task.title}`,
      body: `The onboarding task "${task.title}" is overdue.`,
      entityType: "onboarding_task",
      entityId,
    });
  }
}
