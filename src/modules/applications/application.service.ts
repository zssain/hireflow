import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId } from "@/lib/utils/ids";
import { emitEvent, createAuditLog } from "@/lib/events/emitter";
import { consumeUsage } from "@/lib/utils/usage";
import type { Application, SourceType } from "./application.types";

interface CreateApplicationParams {
  tenantId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  sourceType: SourceType;
  sourceRef?: string;
  initialStageId: string;
  initialStageName: string;
  recruiterOwnerMembershipId: string;
  hiringManagerMembershipIds: string[];
}

export async function createApplication(params: CreateApplicationParams): Promise<Application> {
  const existing = await collections.applications
    .where("tenant_id", "==", params.tenantId)
    .where("candidate_id", "==", params.candidateId)
    .where("job_id", "==", params.jobId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("Candidate has already applied to this job");
  }

  const applicationId = generateId("app");
  const now = Timestamp.now();

  const application: Application = {
    application_id: applicationId,
    tenant_id: params.tenantId,
    candidate_id: params.candidateId,
    candidate_name: params.candidateName,
    candidate_email: params.candidateEmail,
    job_id: params.jobId,
    job_title: params.jobTitle,
    source_type: params.sourceType,
    source_ref: params.sourceRef ?? "",
    current_stage_id: params.initialStageId,
    current_stage_name: params.initialStageName,
    status: "active",
    score_total: null,
    score_status: "pending",
    parse_status: "uploaded",
    recruiter_owner_membership_id: params.recruiterOwnerMembershipId,
    hiring_manager_membership_ids: params.hiringManagerMembershipIds,
    manual_review_required: false,
    last_activity_at: now,
    created_at: now,
    updated_at: now,
  };

  await collections.applications.doc(applicationId).set(application);
  await consumeUsage(params.tenantId, "candidate_applications");

  await emitEvent({
    tenantId: params.tenantId,
    trigger: "application.created",
    payload: {
      entity_type: "application",
      entity_id: applicationId,
      job_id: params.jobId,
      candidate_id: params.candidateId,
      candidate_name: params.candidateName,
    },
  });

  return application;
}

export async function getApplication(applicationId: string): Promise<Application | null> {
  const doc = await collections.applications.doc(applicationId).get();
  return doc.exists ? doc.data()! : null;
}

export async function listApplications(
  tenantId: string,
  filters?: { jobId?: string; status?: string; membershipId?: string }
): Promise<Application[]> {
  let query = collections.applications.where("tenant_id", "==", tenantId) as FirebaseFirestore.Query<Application>;

  if (filters?.jobId) {
    query = query.where("job_id", "==", filters.jobId);
  }
  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.orderBy("created_at", "desc").get();
  let apps = snapshot.docs.map((doc) => doc.data());

  if (filters?.membershipId) {
    apps = apps.filter(
      (a) =>
        a.recruiter_owner_membership_id === filters.membershipId ||
        a.hiring_manager_membership_ids.includes(filters.membershipId!)
    );
  }

  return apps;
}

export async function moveApplicationStage(
  applicationId: string,
  targetStageId: string,
  targetStageName: string,
  actorMembershipId: string
): Promise<Application> {
  const app = await getApplication(applicationId);
  if (!app) throw new Error("Application not found");
  if (app.status !== "active") throw new Error("Cannot move a non-active application");

  const previousStageId = app.current_stage_id;
  const now = Timestamp.now();

  await collections.applications.doc(applicationId).update({
    current_stage_id: targetStageId,
    current_stage_name: targetStageName,
    last_activity_at: now,
    updated_at: now,
  });

  await createAuditLog({
    tenantId: app.tenant_id,
    actorMembershipId,
    action: "application.stage_changed",
    entityType: "application",
    entityId: applicationId,
    before: { stage_id: previousStageId },
    after: { stage_id: targetStageId },
  });

  await emitEvent({
    tenantId: app.tenant_id,
    trigger: "application.stage_changed",
    payload: {
      entity_type: "application",
      entity_id: applicationId,
      job_id: app.job_id,
      candidate_id: app.candidate_id,
      previous_stage_id: previousStageId,
      new_stage_id: targetStageId,
      score_total: app.score_total,
    },
    actorMembershipId,
  });

  return { ...app, current_stage_id: targetStageId, current_stage_name: targetStageName };
}

export async function updateApplicationScoring(
  applicationId: string,
  scoreTotal: number,
  scoreStatus: "processed" | "failed",
  parseStatus: Application["parse_status"],
  manualReviewRequired: boolean
): Promise<void> {
  await collections.applications.doc(applicationId).update({
    score_total: scoreTotal,
    score_status: scoreStatus,
    parse_status: parseStatus,
    manual_review_required: manualReviewRequired,
    updated_at: Timestamp.now(),
  });
}
