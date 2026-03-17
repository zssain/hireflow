import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { moveStageSchema } from "@/lib/validators/schemas";
import { getApplication, moveApplicationStage } from "@/modules/applications/application.service";
import { getJob, getJobPipeline } from "@/modules/jobs/job.service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    assertPermission(auth.membership, "move_pipeline_stages");

    const { id } = await params;
    const body = await req.json();
    const parsed = moveStageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const application = await getApplication(id);
    if (!application || application.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Validate target stage exists in pipeline
    const job = await getJob(application.job_id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const pipeline = await getJobPipeline(job.pipeline_id);
    if (!pipeline) return NextResponse.json({ error: "Pipeline not found" }, { status: 404 });

    const targetStage = pipeline.stages.find((s) => s.stage_id === parsed.data.target_stage_id);
    if (!targetStage) {
      return NextResponse.json({ error: "Target stage not found in pipeline" }, { status: 400 });
    }

    const updated = await moveApplicationStage(
      id,
      targetStage.stage_id,
      targetStage.name,
      auth.membership.membership_id
    );

    return NextResponse.json({
      application_id: updated.application_id,
      new_stage_id: updated.current_stage_id,
      new_stage_name: updated.current_stage_name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 500;
    if (message.includes("permission")) status = 403;
    if (message.includes("not found")) status = 404;
    if (message.includes("non-active")) status = 400;
    return NextResponse.json({ error: message }, { status });
  }
}
