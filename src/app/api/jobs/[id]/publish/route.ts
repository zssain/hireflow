import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { getJob, publishJob } from "@/modules/jobs/job.service";

export const dynamic = "force-dynamic";

export async function POST(
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

    await publishJob(id, auth.membership.membership_id);

    return NextResponse.json({ job_id: id, status: "open" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 500;
    if (message.includes("permission")) status = 403;
    if (message.includes("Cannot publish")) status = 400;
    return NextResponse.json({ error: message }, { status });
  }
}
