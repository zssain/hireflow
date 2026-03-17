import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getFunnelMetrics } from "@/modules/analytics/analytics.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    const url = new URL(req.url);
    const jobId = url.searchParams.get("job_id") ?? undefined;
    const funnel = await getFunnelMetrics(auth.tenantId, jobId);
    return NextResponse.json(funnel);
  } catch (error) {
    console.error("GET /api/analytics/funnel error:", error);
    return NextResponse.json(
      { error: "Failed to fetch funnel metrics", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
