import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getOnboardingPlan, getTasksForPlan } from "@/modules/onboarding/onboarding.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const { planId } = await params;
    const plan = await getOnboardingPlan(planId);
    if (!plan || plan.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    const tasks = await getTasksForPlan(planId);

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        task_id: t.task_id,
        title: t.title,
        assigned_role: t.assigned_role,
        status: t.status,
        priority: t.priority,
        due_at: t.due_at.toDate().toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/onboarding/plans/[planId]/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
