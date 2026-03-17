import { NextRequest, NextResponse } from "next/server";
import { publicApplySchema } from "@/lib/validators/schemas";
import { getJobByPublicId, getJobPipeline } from "@/modules/jobs/job.service";
import { findOrCreateCandidate } from "@/modules/candidates/candidate.service";
import { createApplication } from "@/modules/applications/application.service";
import { processResume } from "@/modules/resume-processing/ai-summary.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const body = {
      job_public_id: formData.get("job_public_id") as string,
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      linkedin_url: (formData.get("linkedin_url") as string) || "",
    };

    const parsed = publicApplySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    // Find the job
    const job = await getJobByPublicId(parsed.data.job_public_id);
    if (!job || job.status !== "open") {
      return NextResponse.json({ error: "Job not found or not accepting applications" }, { status: 404 });
    }

    // Get pipeline to find initial stage
    const pipeline = await getJobPipeline(job.pipeline_id);
    if (!pipeline || pipeline.stages.length === 0) {
      return NextResponse.json({ error: "Job pipeline not configured" }, { status: 500 });
    }

    const initialStage = pipeline.stages.sort((a, b) => a.order - b.order)[0];

    // Dedupe candidate
    const candidate = await findOrCreateCandidate({
      tenantId: job.tenant_id,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      linkedinUrl: parsed.data.linkedin_url,
    });

    // Create application
    const application = await createApplication({
      tenantId: job.tenant_id,
      candidateId: candidate.candidate_id,
      candidateName: candidate.name,
      candidateEmail: candidate.email,
      jobId: job.job_id,
      jobTitle: job.title,
      sourceType: "careers_page",
      initialStageId: initialStage.stage_id,
      initialStageName: initialStage.name,
      recruiterOwnerMembershipId: job.recruiter_owner_membership_id,
      hiringManagerMembershipIds: job.hiring_manager_membership_ids,
    });

    // Process resume if uploaded
    const resumeFile = formData.get("resume_file") as File | null;
    if (resumeFile) {
      const buffer = Buffer.from(await resumeFile.arrayBuffer());
      // Process async — don't block the response
      processResume({
        tenantId: job.tenant_id,
        applicationId: application.application_id,
        candidateId: candidate.candidate_id,
        jobId: job.job_id,
        jobTitle: job.title,
        jobDescription: job.description_html,
        jobRequirements: job.requirements_text,
        resumeBuffer: buffer,
        mimeType: resumeFile.type,
      }).catch(() => {
        // Failure is handled inside processResume
      });
    }

    return NextResponse.json({
      application_id: application.application_id,
      status: "submitted",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("already applied") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
