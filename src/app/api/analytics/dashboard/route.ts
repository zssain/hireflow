import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getDashboardMetrics } from "@/modules/analytics/analytics.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;
  const metrics = await getDashboardMetrics(auth.tenantId);
  return NextResponse.json(metrics);
}
