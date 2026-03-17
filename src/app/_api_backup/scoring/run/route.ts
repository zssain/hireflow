import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getApplication } from "@/modules/applications/application.service";
import { getProcessingResult } from "@/modules/resume-processing/ai-summary.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const body = await req.json();
    const { application_id } = body;

    if (!application_id) {
      return NextResponse.json({ error: "Missing application_id" }, { status: 400 });
    }

    const application = await getApplication(application_id);
    if (!application || application.tenant_id !== auth.tenantId) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const processing = await getProcessingResult(application_id);

    return NextResponse.json({
      application_id,
      score_total: application.score_total,
      score_status: application.score_status,
      parse_status: application.parse_status,
      processing: processing
        ? {
            rule_score: processing.rule_score,
            ai_summary: processing.ai_summary,
            strengths: processing.strengths,
            gaps: processing.gaps,
            confidence: processing.parse_confidence,
            structured_data: processing.structured_data,
          }
        : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
