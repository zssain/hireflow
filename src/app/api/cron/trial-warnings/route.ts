import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import { createNotification } from "@/modules/notifications/notification.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const tenantsSnap = await collections.tenants
      .where("status", "==", "trial_active")
      .where("trial_ends_at", "<=", Timestamp.fromDate(in3days))
      .get();

    let warnings = 0;
    for (const doc of tenantsSnap.docs) {
      const tenant = doc.data();
      const membershipsSnap = await collections.memberships
        .where("tenant_id", "==", tenant.tenant_id).where("role", "==", "admin").where("status", "==", "active").get();

      for (const mDoc of membershipsSnap.docs) {
        await createNotification({
          tenantId: tenant.tenant_id, recipientMembershipId: mDoc.data().membership_id,
          type: "trial_expiring", title: "Trial ending soon",
          body: `Your trial ends on ${tenant.trial_ends_at.toDate().toLocaleDateString()}. Upgrade to keep your data.`,
          entityType: "tenant", entityId: tenant.tenant_id,
        });
        warnings++;
      }
    }
    return NextResponse.json({ warnings_sent: warnings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
