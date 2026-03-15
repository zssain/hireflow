import { NextRequest, NextResponse } from "next/server";
import { updateMembershipSchema } from "@/lib/validators/schemas";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { getMembership, updateMembership, listMemberships } from "@/modules/memberships/membership.service";
import { createAuditLog } from "@/lib/events/emitter";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;

  const { id } = await params;
  const membership = await getMembership(id);

  if (!membership || membership.tenant_id !== auth.tenantId) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  }

  return NextResponse.json(membership);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    assertPermission(auth.membership, "manage_team");

    const { id } = await params;
    const body = await req.json();
    const parsed = updateMembershipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const target = await getMembership(id);
    if (!target || target.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Membership not found" }, { status: 404 });
    }

    // Prevent removing the last admin
    if (parsed.data.role && parsed.data.role !== "admin" && target.role === "admin") {
      const members = await listMemberships(auth.tenantId);
      const adminCount = members.filter((m) => m.role === "admin" && m.status === "active").length;
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last admin" },
          { status: 400 }
        );
      }
    }

    const { tenant_id: _, ...updates } = parsed.data;
    await updateMembership(id, updates);

    await createAuditLog({
      tenantId: auth.tenantId,
      actorMembershipId: auth.membership.membership_id,
      action: "team.membership_updated",
      entityType: "membership",
      entityId: id,
      before: target as unknown as Record<string, unknown>,
      after: updates,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("permission") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
