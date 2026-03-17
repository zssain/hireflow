import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { createNotification } from "@/modules/notifications/notification.service";
import { dispatchEvent } from "@/modules/automation/event-emitter";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = Timestamp.now();
    const tasksSnap = await collections.onboardingTasks
      .where("status", "in", ["pending", "in_progress"])
      .where("due_at", "<", now)
      .get();

    let marked = 0;
    for (const doc of tasksSnap.docs) {
      const task = doc.data();
      await doc.ref.update({ status: "overdue", updated_at: now });

      if (task.assigned_membership_id) {
        await createNotification({
          tenantId: task.tenant_id, recipientMembershipId: task.assigned_membership_id,
          type: "task_overdue", title: `Overdue: ${task.title}`, body: `Task was due ${task.due_at.toDate().toLocaleDateString()}.`,
          entityType: "onboarding_task", entityId: task.task_id,
        });
      }

      await dispatchEvent({
        tenantId: task.tenant_id, trigger: "onboarding.task.overdue",
        payload: { entity_type: "onboarding_task", entity_id: task.task_id, plan_id: task.plan_id },
      });
      marked++;
    }
    return NextResponse.json({ overdue_marked: marked });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
