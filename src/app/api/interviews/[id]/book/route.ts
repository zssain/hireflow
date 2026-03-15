import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { getInterview, bookInterview } from "@/modules/scheduling/scheduling.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const { id } = await params;
    const body = await req.json();
    const interview = await getInterview(id);
    if (!interview || interview.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const booked = await bookInterview(id, new Date(body.selected_start));
    return NextResponse.json({ status: "booked", scheduled_start: booked.scheduled_start?.toDate().toISOString(), scheduled_end: booked.scheduled_end?.toDate().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
