import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { getInterview, cancelInterview } from "@/modules/scheduling/scheduling.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "schedule_interviews");

    const { id } = await params;
    const interview = await getInterview(id);
    if (!interview || interview.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await cancelInterview(id);
    return NextResponse.json({ interview_id: id, status: "cancelled" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
