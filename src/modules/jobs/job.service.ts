import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId, generatePublicId } from "@/lib/utils/ids";
import { emitEvent, createAuditLog } from "@/lib/events/emitter";
import { consumeUsage } from "@/lib/utils/usage";
import type { Job, JobPipeline, PipelineTemplate } from "./job.types";

interface CreateJobParams {
  tenantId: string;
  title: string;
  department: string;
  location: string;
  employmentType: Job["employment_type"];
  salaryRange?: Job["salary_range"];
  descriptionHtml: string;
  requirementsText: string;
  visibility: Job["visibility"];
  pipelineTemplateId: string;
  createdByMembershipId: string;
  hiringManagerMembershipIds?: string[];
}

export async function createJob(params: CreateJobParams): Promise<Job> {
  const jobId = generateId("job");
  const pipelineId = generateId("pl");
  const publicId = generatePublicId();
  const now = Timestamp.now();

  // Clone pipeline from template
  const templateDoc = await collections.pipelineTemplates.doc(params.pipelineTemplateId).get();
  if (!templateDoc.exists) {
    throw new Error("Pipeline template not found");
  }
  const template = templateDoc.data()!;

  const pipeline: JobPipeline = {
    pipeline_id: pipelineId,
    tenant_id: params.tenantId,
    job_id: jobId,
    name: template.name,
    stages: template.stages,
    created_at: now,
    updated_at: now,
  };

  const job: Job = {
    job_id: jobId,
    tenant_id: params.tenantId,
    public_id: publicId,
    title: params.title,
    department: params.department,
    location: params.location,
    employment_type: params.employmentType,
    salary_range: params.salaryRange,
    description_html: params.descriptionHtml,
    requirements_text: params.requirementsText,
    visibility: params.visibility,
    status: "draft",
    pipeline_template_id: params.pipelineTemplateId,
    pipeline_id: pipelineId,
    recruiter_owner_membership_id: params.createdByMembershipId,
    hiring_manager_membership_ids: params.hiringManagerMembershipIds ?? [],
    published_at: null,
    created_by_membership_id: params.createdByMembershipId,
    created_at: now,
    updated_at: now,
  };

  const batch = collections.jobs.firestore.batch();
  batch.set(collections.jobs.doc(jobId), job);
  batch.set(collections.jobPipelines.doc(pipelineId), pipeline);
  await batch.commit();

  await emitEvent({
    tenantId: params.tenantId,
    trigger: "job.created",
    payload: { entity_type: "job", entity_id: jobId, job_id: jobId, title: params.title },
    actorMembershipId: params.createdByMembershipId,
  });

  return job;
}

export async function getJob(jobId: string): Promise<Job | null> {
  const doc = await collections.jobs.doc(jobId).get();
  return doc.exists ? doc.data()! : null;
}

export async function getJobByPublicId(publicId: string): Promise<Job | null> {
  const snapshot = await collections.jobs
    .where("public_id", "==", publicId)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].data();
}

export async function listJobs(
  tenantId: string,
  filters?: { status?: Job["status"]; membershipId?: string }
): Promise<Job[]> {
  let query = collections.jobs.where("tenant_id", "==", tenantId) as FirebaseFirestore.Query<Job>;

  if (filters?.status) {
    query = query.where("status", "==", filters.status);
  }

  const snapshot = await query.orderBy("created_at", "desc").get();
  let jobs = snapshot.docs.map((doc) => doc.data());

  // Filter by assigned membership for hiring managers
  if (filters?.membershipId) {
    jobs = jobs.filter(
      (j) =>
        j.recruiter_owner_membership_id === filters.membershipId ||
        j.hiring_manager_membership_ids.includes(filters.membershipId!)
    );
  }

  return jobs;
}

export async function updateJob(
  jobId: string,
  updates: Record<string, unknown>,
  actorMembershipId: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");

  await collections.jobs.doc(jobId).update({
    ...updates,
    updated_at: Timestamp.now(),
  });

  await createAuditLog({
    tenantId: job.tenant_id,
    actorMembershipId,
    action: "job.updated",
    entityType: "job",
    entityId: jobId,
    before: job as unknown as Record<string, unknown>,
    after: updates,
  });
}

export async function publishJob(jobId: string, actorMembershipId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status !== "draft" && job.status !== "paused") {
    throw new Error(`Cannot publish job with status '${job.status}'`);
  }

  const now = Timestamp.now();
  await collections.jobs.doc(jobId).update({
    status: "open",
    published_at: now,
    updated_at: now,
  });

  await consumeUsage(job.tenant_id, "active_jobs");

  await emitEvent({
    tenantId: job.tenant_id,
    trigger: "job.published",
    payload: { entity_type: "job", entity_id: jobId, job_id: jobId, title: job.title },
    actorMembershipId,
  });
}

export async function closeJob(jobId: string, actorMembershipId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status === "closed") throw new Error("Job is already closed");

  await collections.jobs.doc(jobId).update({
    status: "closed",
    updated_at: Timestamp.now(),
  });

  await createAuditLog({
    tenantId: job.tenant_id,
    actorMembershipId,
    action: "job.closed",
    entityType: "job",
    entityId: jobId,
  });
}

export async function getJobPipeline(pipelineId: string): Promise<JobPipeline | null> {
  const doc = await collections.jobPipelines.doc(pipelineId).get();
  return doc.exists ? doc.data()! : null;
}

export async function listPipelineTemplates(tenantId: string): Promise<PipelineTemplate[]> {
  const snapshot = await collections.pipelineTemplates
    .where("tenant_id", "==", tenantId)
    .get();
  return snapshot.docs.map((doc) => doc.data());
}

export async function getPublicJobs(tenantId: string): Promise<Job[]> {
  const snapshot = await collections.jobs
    .where("tenant_id", "==", tenantId)
    .where("visibility", "==", "public")
    .where("status", "==", "open")
    .orderBy("published_at", "desc")
    .get();
  return snapshot.docs.map((doc) => doc.data());
}
