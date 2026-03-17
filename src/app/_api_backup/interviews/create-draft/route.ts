import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { createInterviewDraftSchema } from "@/lib/validators/schemas";
import { createInterviewDraft } from "@/modules/scheduling/scheduling.service";
import { getApplication } from "@/modules/applications/application.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "schedule_interviews");

    const body = await req.json();
    const parsed = createInterviewDraftSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const application = await getApplication(parsed.data.application_id);
    if (!application || application.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const interview = await createInterviewDraft({
      tenantId: auth.tenantId,
      applicationId: parsed.data.application_id,
      candidateId: application.candidate_id,
      jobId: application.job_id,
      roundName: parsed.data.round_name,
      interviewerMembershipIds: parsed.data.interviewer_membership_ids,
      durationMinutes: parsed.data.duration_minutes,
      candidateTimezone: parsed.data.candidate_timezone,
      dateWindowStart: parsed.data.date_window_start,
      dateWindowEnd: parsed.data.date_window_end,
    });

    return NextResponse.json({
      interview_id: interview.interview_id,
      slot_options: interview.slot_options.map(s => ({ start: s.start.toDate().toISOString(), end: s.end.toDate().toISOString() })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("permission") ? 403 : 500 });
  }
}
