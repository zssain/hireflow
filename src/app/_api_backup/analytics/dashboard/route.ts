import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getDashboardMetrics } from "@/modules/analytics/analytics.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    const metrics = await getDashboardMetrics(auth.tenantId);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("GET /api/analytics/dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
