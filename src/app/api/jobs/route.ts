import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { assertPlanQuota } from "@/lib/plan-gates/quotas";
import { createJobSchema } from "@/lib/validators/schemas";
import { createJob, listJobs } from "@/modules/jobs/job.service";
import { getTenant } from "@/modules/tenants/tenant.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as "draft" | "open" | "paused" | "closed" | null;

  const isHiringManager = auth.membership.role === "hiring_manager";
  const jobs = await listJobs(auth.tenantId, {
    status: status ?? undefined,
    membershipId: isHiringManager ? auth.membership.membership_id : undefined,
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    assertPermission(auth.membership, "create_edit_jobs");

    const tenant = await getTenant(auth.tenantId);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    await assertPlanQuota(auth.tenantId, tenant.plan_code, "active_jobs");

    const body = await req.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const job = await createJob({
      tenantId: auth.tenantId,
      title: parsed.data.title,
      department: parsed.data.department,
      location: parsed.data.location,
      employmentType: parsed.data.employment_type,
      salaryRange: parsed.data.salary_range,
      descriptionHtml: parsed.data.description_html,
      requirementsText: parsed.data.requirements_text,
      visibility: parsed.data.visibility,
      pipelineTemplateId: parsed.data.pipeline_template_id,
      createdByMembershipId: auth.membership.membership_id,
      hiringManagerMembershipIds: parsed.data.hiring_manager_membership_ids,
    });

    return NextResponse.json({ job_id: job.job_id, public_id: job.public_id, status: job.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 500;
    if (message.includes("permission")) status = 403;
    if (message.includes("Quota")) status = 402;
    if (message.includes("not found")) status = 404;
    return NextResponse.json({ error: message }, { status });
  }
}
