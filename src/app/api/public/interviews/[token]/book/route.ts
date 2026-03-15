import { NextRequest, NextResponse } from "next/server";
import { bookInterviewSchema } from "@/lib/validators/schemas";
import { getInterviewByToken, bookInterview } from "@/modules/scheduling/scheduling.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = bookInterviewSchema.safeParse({ ...body, booking_token: token });
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const interview = await getInterviewByToken(token);
    if (!interview) return NextResponse.json({ error: "Invalid booking token" }, { status: 404 });

    const booked = await bookInterview(interview.interview_id, new Date(parsed.data.selected_start));
    return NextResponse.json({ status: "booked", scheduled_start: booked.scheduled_start?.toDate().toISOString(), scheduled_end: booked.scheduled_end?.toDate().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
