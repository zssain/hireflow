import { Timestamp } from "firebase-admin/firestore";
import type { PlanCode } from "@/modules/tenants/tenant.types";

export type TriggerEvent =
  | "tenant.created"
  | "job.created"
  | "job.published"
  | "application.created"
  | "application.processing_completed"
  | "application.stage_changed"
  | "interview.draft_created"
  | "interview.booked"
  | "interview.completed"
  | "offer.created"
  | "offer.sent"
  | "offer.accepted"
  | "offer.declined"
  | "onboarding.plan_created"
  | "onboarding.task.overdue";

export type ConditionOp = "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in" | "contains" | "exists";

export type ActionType =
  | "move_stage"
  | "create_notification"
  | "send_email_template"
  | "assign_owner"
  | "create_onboarding_plan"
  | "mark_flag"
  | "set_field"
  | "create_task"
  | "remind_assignee";

export interface RuleCondition {
  path: string;
  op: ConditionOp;
  value: unknown;
}

export interface RuleAction {
  type: ActionType;
  params: Record<string, unknown>;
}

export interface WorkflowRule {
  rule_id: string;
  tenant_id: string;
  name: string;
  enabled: boolean;
  priority: number;
  trigger: TriggerEvent;
  conditions: RuleCondition[];
  actions: RuleAction[];
  plan_required: PlanCode;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface RuleActionLog {
  log_id: string;
  tenant_id: string;
  event_id: string;
  rule_id: string;
  action_index: number;
  status: "success" | "failed" | "skipped";
  error_message: string | null;
  created_at: Timestamp;
}

export interface DomainEvent {
  event_id: string;
  tenant_id: string;
  trigger: TriggerEvent;
  payload: Record<string, unknown>;
  actor_membership_id: string | null;
  created_at: Timestamp;
}
