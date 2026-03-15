import { NextRequest, NextResponse } from "next/server";
import { createTenantSchema } from "@/lib/validators/schemas";
import { verifyIdToken, getOrCreateUser } from "@/modules/auth/auth.service";
import { createTenant } from "@/modules/tenants/tenant.service";
import { emitEvent } from "@/lib/events/emitter";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const decoded = await verifyIdToken(authHeader.slice(7));
    const body = await req.json();
    const parsed = createTenantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Ensure user doc exists
    await getOrCreateUser(
      decoded.uid,
      decoded.email ?? "",
      decoded.name ?? decoded.email ?? ""
    );

    const result = await createTenant({
      companyName: parsed.data.company_name,
      slug: parsed.data.slug,
      ownerUserId: decoded.uid,
    });

    await emitEvent({
      tenantId: result.tenant.tenant_id,
      trigger: "tenant.created",
      payload: {
        entity_type: "tenant",
        entity_id: result.tenant.tenant_id,
        slug: result.tenant.slug,
      },
      actorMembershipId: result.membership.membership_id,
    });

    return NextResponse.json({
      tenant_id: result.tenant.tenant_id,
      membership_id: result.membership.membership_id,
      plan_code: result.subscription.plan_code,
      trial_ends_at: result.tenant.trial_ends_at.toDate().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "Slug already taken" ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
