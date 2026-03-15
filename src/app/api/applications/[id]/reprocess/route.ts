import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getApplication } from "@/modules/applications/application.service";
import { getProcessingResult } from "@/modules/resume-processing/ai-summary.service";
import { getJob } from "@/modules/jobs/job.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const { id } = await params;
    const application = await getApplication(id);
    if (!application || application.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const existing = await getProcessingResult(id);
    if (!existing) {
      return NextResponse.json({ error: "No previous processing result found" }, { status: 404 });
    }

    const job = await getJob(application.job_id);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // For reprocessing, we would need the original resume buffer
    // In V1 (no file storage), reprocessing re-runs scoring on existing extracted text
    // A full reprocess with re-upload would require the user to provide the file again

    return NextResponse.json({
      application_id: id,
      message: "Reprocessing is available when resume is re-uploaded. Current score and data preserved.",
      current_score: existing.rule_score.total,
      parse_status: existing.parse_status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
