import { Timestamp } from "firebase-admin/firestore";

export type OnboardingPlanStatus = "active" | "completed" | "cancelled";
export type OnboardingTaskStatus = "pending" | "in_progress" | "completed" | "blocked" | "overdue" | "skipped";
export type TaskPriority = "low" | "medium" | "high";
export type AssignedRole = "hr" | "employee" | "manager";

export interface OnboardingPlan {
  plan_id: string;
  tenant_id: string;
  application_id: string;
  candidate_id: string;
  job_id: string;
  status: OnboardingPlanStatus;
  start_date: Timestamp;
  template_code: string;
  manager_membership_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface OnboardingTask {
  task_id: string;
  tenant_id: string;
  plan_id: string;
  assigned_role: AssignedRole;
  assigned_membership_id: string | null;
  title: string;
  description: string;
  status: OnboardingTaskStatus;
  priority: TaskPriority;
  due_at: Timestamp;
  reminder_policy: {
    before_hours: number[];
  };
  dependency_task_id: string | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}
