import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { updateJobSchema } from "@/lib/validators/schemas";
import { getJob, updateJob, getJobPipeline } from "@/modules/jobs/job.service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const job = await getJob(id);

  if (!job || job.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const pipeline = await getJobPipeline(job.pipeline_id);

  return NextResponse.json({ job, pipeline });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    assertPermission(auth.membership, "create_edit_jobs");

    const { id } = await params;
    const job = await getJob(id);
    if (!job || job.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { tenant_id: _, ...updates } = parsed.data;
    await updateJob(id, updates, auth.membership.membership_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
