import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getApplication } from "@/modules/applications/application.service";
import { getJob } from "@/modules/jobs/job.service";
import { processResume } from "@/modules/resume-processing/ai-summary.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const formData = await req.formData();
    const applicationId = formData.get("application_id") as string;
    const resumeFile = formData.get("resume_file") as File;

    if (!applicationId || !resumeFile) {
      return NextResponse.json({ error: "Missing application_id or resume_file" }, { status: 400 });
    }

    const application = await getApplication(applicationId);
    if (!application || application.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const job = await getJob(application.job_id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await resumeFile.arrayBuffer());

    const result = await processResume({
      tenantId: auth.tenantId,
      applicationId,
      candidateId: application.candidate_id,
      jobId: job.job_id,
      jobTitle: job.title,
      jobDescription: job.description_html,
      jobRequirements: job.requirements_text,
      resumeBuffer: buffer,
      mimeType: resumeFile.type,
    });

    return NextResponse.json({
      processing_id: result.processing_id,
      parse_status: result.parse_status,
      confidence: result.parse_confidence,
      score_total: result.rule_score.total,
      ai_summary: result.ai_summary,
      strengths: result.strengths,
      gaps: result.gaps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
