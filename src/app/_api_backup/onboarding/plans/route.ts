import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { createOnboardingPlanSchema } from "@/lib/validators/schemas";
import { createOnboardingPlan, listOnboardingPlans } from "@/modules/onboarding/onboarding.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    const plans = await listOnboardingPlans(auth.tenantId);
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("GET /api/onboarding/plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch onboarding plans", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const body = await req.json();
    const parsed = createOnboardingPlanSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const plan = await createOnboardingPlan({
      tenantId: auth.tenantId,
      applicationId: parsed.data.application_id,
      candidateId: "",
      jobId: "",
      templateCode: parsed.data.template_code,
      startDate: new Date(parsed.data.start_date),
      managerMembershipId: parsed.data.manager_membership_id,
    });

    return NextResponse.json({ plan_id: plan.plan_id, status: plan.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
