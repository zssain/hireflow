import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { createNotification } from "@/modules/notifications/notification.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Remind about upcoming interviews
    const interviews = await collections.interviews
      .where("status", "==", "booked")
      .where("scheduled_start", "<=", Timestamp.fromDate(in24h))
      .where("scheduled_start", ">=", Timestamp.now())
      .get();

    let reminders = 0;
    for (const doc of interviews.docs) {
      const interview = doc.data();
      for (const membershipId of interview.interviewer_membership_ids) {
        await createNotification({
          tenantId: interview.tenant_id, recipientMembershipId: membershipId,
          type: "interview_reminder", title: `Interview in 24h: ${interview.round_name}`,
          body: `You have an interview scheduled for ${interview.scheduled_start?.toDate().toLocaleString()}.`,
          entityType: "interview", entityId: interview.interview_id,
        });
        reminders++;
      }
    }

    return NextResponse.json({ reminders_sent: reminders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
