import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { listApplications } from "@/modules/applications/application.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;

  const url = new URL(req.url);
  const jobId = url.searchParams.get("job_id") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;

  const isHiringManager = auth.membership.role === "hiring_manager";

  const applications = await listApplications(auth.tenantId, {
    jobId,
    status,
    membershipId: isHiringManager ? auth.membership.membership_id : undefined,
  });

  return NextResponse.json({ applications });
}
