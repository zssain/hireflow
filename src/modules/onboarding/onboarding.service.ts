import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import { emitEvent } from "@/lib/events/emitter";
import { daysFromNow } from "@/lib/utils/dates";
import type { OnboardingPlan, OnboardingTask } from "./onboarding.types";

interface CreatePlanParams {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  templateCode: string;
  startDate: Date;
  managerMembershipId: string;
}

const DEFAULT_TASKS = [
  { title: "Send welcome email", role: "hr" as const, priority: "high" as const, dayOffset: 0 },
  { title: "Set up IT accounts", role: "hr" as const, priority: "high" as const, dayOffset: -2 },
  { title: "Prepare workspace/equipment", role: "manager" as const, priority: "medium" as const, dayOffset: -1 },
  { title: "Schedule first-week meetings", role: "manager" as const, priority: "medium" as const, dayOffset: 0 },
  { title: "Complete tax & legal forms", role: "employee" as const, priority: "high" as const, dayOffset: 1 },
  { title: "Team introduction meeting", role: "manager" as const, priority: "medium" as const, dayOffset: 1 },
  { title: "Review company handbook", role: "employee" as const, priority: "low" as const, dayOffset: 3 },
  { title: "30-day check-in", role: "manager" as const, priority: "medium" as const, dayOffset: 30 },
];

export async function createOnboardingPlan(params: CreatePlanParams): Promise<OnboardingPlan> {
  const planId = generateId("obp");
  const now = Timestamp.now();

  const plan: OnboardingPlan = {
    plan_id: planId,
    tenant_id: params.tenantId,
    application_id: params.applicationId,
    candidate_id: params.candidateId,
    job_id: params.jobId,
    status: "active",
    start_date: Timestamp.fromDate(params.startDate),
    template_code: params.templateCode,
    manager_membership_id: params.managerMembershipId,
    created_at: now,
    updated_at: now,
  };

  const batch = collections.onboardingPlans.firestore.batch();
  batch.set(collections.onboardingPlans.doc(planId), plan);

  // Create default tasks
  for (const taskDef of DEFAULT_TASKS) {
    const taskId = generateId("obt");
    const dueDate = new Date(params.startDate);
    dueDate.setDate(dueDate.getDate() + taskDef.dayOffset);

    const task: OnboardingTask = {
      task_id: taskId,
      tenant_id: params.tenantId,
      plan_id: planId,
      assigned_role: taskDef.role,
      assigned_membership_id: taskDef.role === "manager" ? params.managerMembershipId : null,
      title: taskDef.title,
      description: "",
      status: "pending",
      priority: taskDef.priority,
      due_at: Timestamp.fromDate(dueDate),
      reminder_policy: { before_hours: [24] },
      dependency_task_id: null,
      completed_at: null,
      created_at: now,
      updated_at: now,
    };

    batch.set(collections.onboardingTasks.doc(taskId), task);
  }

  await batch.commit();

  await emitEvent({
    tenantId: params.tenantId,
    trigger: "onboarding.plan_created",
    payload: { entity_type: "onboarding_plan", entity_id: planId, job_id: params.jobId, application_id: params.applicationId },
  });

  return plan;
}

export async function getOnboardingPlan(planId: string): Promise<OnboardingPlan | null> {
  const doc = await collections.onboardingPlans.doc(planId).get();
  return doc.exists ? doc.data()! : null;
}

export async function listOnboardingPlans(tenantId: string): Promise<OnboardingPlan[]> {
  const snapshot = await collections.onboardingPlans
    .where("tenant_id", "==", tenantId)
    .orderBy("created_at", "desc")
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function getTasksForPlan(planId: string): Promise<OnboardingTask[]> {
  const snapshot = await collections.onboardingTasks
    .where("plan_id", "==", planId)
    .orderBy("due_at", "asc")
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function completeTask(taskId: string): Promise<void> {
  const doc = await collections.onboardingTasks.doc(taskId).get();
  if (!doc.exists) throw new Error("Task not found");

  const task = doc.data()!;
  if (task.dependency_task_id) {
    const depDoc = await collections.onboardingTasks.doc(task.dependency_task_id).get();
    if (depDoc.exists && depDoc.data()!.status !== "completed") {
      throw new Error("Dependency task not yet completed");
    }
  }

  await collections.onboardingTasks.doc(taskId).update({
    status: "completed",
    completed_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });

  // Check if all tasks in plan are completed
  const allTasks = await getTasksForPlan(task.plan_id);
  const allDone = allTasks.every((t) => t.task_id === taskId || t.status === "completed" || t.status === "skipped");

  if (allDone) {
    await collections.onboardingPlans.doc(task.plan_id).update({
      status: "completed",
      updated_at: Timestamp.now(),
    });
  }
}
