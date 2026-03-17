import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { importApplicationsSchema } from "@/lib/validators/schemas";
import { findOrCreateCandidate } from "@/modules/candidates/candidate.service";
import { createApplication } from "@/modules/applications/application.service";
import { getJob, getJobPipeline } from "@/modules/jobs/job.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const body = await req.json();
    const parsed = importApplicationsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const job = await getJob(parsed.data.job_id);
    if (!job || job.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const pipeline = await getJobPipeline(job.pipeline_id);
    const initialStage = pipeline?.stages.sort((a, b) => a.order - b.order)[0];
    if (!initialStage) return NextResponse.json({ error: "No pipeline stages" }, { status: 500 });

    const results = [];
    for (const c of parsed.data.candidates) {
      try {
        const candidate = await findOrCreateCandidate({ tenantId: auth.tenantId, name: c.name, email: c.email, phone: c.phone ?? "", linkedinUrl: c.linkedin_url });
        const app = await createApplication({
          tenantId: auth.tenantId, candidateId: candidate.candidate_id, candidateName: c.name, candidateEmail: c.email,
          jobId: job.job_id, jobTitle: job.title, sourceType: "csv_import", initialStageId: initialStage.stage_id, initialStageName: initialStage.name,
          recruiterOwnerMembershipId: auth.membership.membership_id, hiringManagerMembershipIds: job.hiring_manager_membership_ids,
        });
        results.push({ email: c.email, application_id: app.application_id, status: "created" });
      } catch (err) {
        results.push({ email: c.email, status: "failed", error: err instanceof Error ? err.message : "Unknown" });
      }
    }

    return NextResponse.json({ imported: results.length, results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
