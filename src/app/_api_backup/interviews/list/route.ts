import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { listInterviews } from "@/modules/scheduling/scheduling.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const applicationId = url.searchParams.get("application_id") ?? undefined;

    const interviews = await listInterviews(auth.tenantId, { status, applicationId });

    return NextResponse.json({
      interviews: interviews.map((i) => ({
        interview_id: i.interview_id,
        application_id: i.application_id,
        round_name: i.round_name,
        mode: i.mode,
        duration_minutes: i.duration_minutes,
        status: i.status,
        scheduled_start: i.scheduled_start?.toDate().toISOString() ?? null,
        scheduled_end: i.scheduled_end?.toDate().toISOString() ?? null,
        interviewer_membership_ids: i.interviewer_membership_ids,
        created_at: i.created_at.toDate().toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET /api/interviews/list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch interviews", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
