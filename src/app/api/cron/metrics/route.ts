import { NextRequest, NextResponse } from "next/server";
import { collections } from "@/lib/firebase/firestore";
import { recordDailyMetrics } from "@/modules/analytics/analytics.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "") ?? new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tenantsSnap = await collections.tenants.where("status", "in", ["trial_active", "active"]).get();
    let recorded = 0;
    for (const doc of tenantsSnap.docs) {
      await recordDailyMetrics(doc.data().tenant_id);
      recorded++;
    }
    return NextResponse.json({ tenants_recorded: recorded });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed" }, { status: 500 });
  }
}
