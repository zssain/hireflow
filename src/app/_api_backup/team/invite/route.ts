import { NextRequest, NextResponse } from "next/server";
import { inviteTeamMemberSchema } from "@/lib/validators/schemas";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { assertPlanQuota } from "@/lib/plan-gates/quotas";
import { inviteMember } from "@/modules/memberships/membership.service";
import { getTenant } from "@/modules/tenants/tenant.service";
import { consumeUsage } from "@/lib/utils/usage";
import { createAuditLog } from "@/lib/events/emitter";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    assertPermission(auth.membership, "manage_team");

    const body = await req.json();
    const parsed = inviteTeamMemberSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const tenant = await getTenant(auth.tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    await assertPlanQuota(auth.tenantId, tenant.plan_code, "internal_users");

    const result = await inviteMember({
      tenantId: auth.tenantId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByMembershipId: auth.membership.membership_id,
      assignedJobIds: parsed.data.assigned_job_ids,
    });

    await consumeUsage(auth.tenantId, "internal_users");

    await createAuditLog({
      tenantId: auth.tenantId,
      actorMembershipId: auth.membership.membership_id,
      action: "team.member_invited",
      entityType: "membership",
      entityId: result.membership.membership_id,
      after: { email: parsed.data.email, role: parsed.data.role },
    });

    return NextResponse.json({
      membership_id: result.membership.membership_id,
      status: "invited",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    let status = 500;
    if (message.includes("permission")) status = 403;
    if (message.includes("Quota")) status = 402;
    if (message.includes("already")) status = 409;
    return NextResponse.json({ error: message }, { status });
  }
}
