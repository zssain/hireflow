import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { getInterview } from "@/modules/scheduling/scheduling.service";
import { collections } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { generateSlots } from "@/modules/scheduling/slot-generator";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "schedule_interviews");

    const { id } = await params;
    const body = await req.json();
    const interview = await getInterview(id);
    if (!interview || interview.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const slots = generateSlots({
      windowStart: new Date(body.date_window_start),
      windowEnd: new Date(body.date_window_end),
      durationMinutes: interview.duration_minutes,
    });

    const slotOptions = slots.slice(0, 10).map(s => ({ start: Timestamp.fromDate(s.start), end: Timestamp.fromDate(s.end) }));

    await collections.interviews.doc(id).update({ status: "draft", slot_options: slotOptions, scheduled_start: null, scheduled_end: null, updated_at: Timestamp.now() });

    return NextResponse.json({ interview_id: id, status: "draft", slot_options: slotOptions.map(s => ({ start: s.start.toDate().toISOString(), end: s.end.toDate().toISOString() })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
