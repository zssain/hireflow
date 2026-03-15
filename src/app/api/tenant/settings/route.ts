import { NextRequest, NextResponse } from "next/server";
import { updateTenantSettingsSchema } from "@/lib/validators/schemas";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { updateTenantSettings, getTenant } from "@/modules/tenants/tenant.service";
import { createAuditLog } from "@/lib/events/emitter";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;

  const tenant = await getTenant(auth.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  return NextResponse.json(tenant);
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    assertPermission(auth.membership, "manage_workspace");

    const body = await req.json();
    const parsed = updateTenantSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const before = await getTenant(auth.tenantId);
    const { tenant_id: _, ...updates } = parsed.data;

    await updateTenantSettings(auth.tenantId, updates);

    await createAuditLog({
      tenantId: auth.tenantId,
      actorMembershipId: auth.membership.membership_id,
      action: "tenant.settings_updated",
      entityType: "tenant",
      entityId: auth.tenantId,
      before: before as unknown as Record<string, unknown>,
      after: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
