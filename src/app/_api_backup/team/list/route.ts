import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { listMemberships } from "@/modules/memberships/membership.service";
import { collections } from "@/lib/firebase/firestore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;

    const memberships = await listMemberships(auth.tenantId);

    // Enrich with user names
    const enriched = await Promise.all(
      memberships.map(async (m) => {
        let userName = m.user_id;
        let userEmail = "";

        // For active members, fetch user doc
        if (m.status === "active") {
          const userDoc = await collections.users.doc(m.user_id).get();
          if (userDoc.exists) {
            const user = userDoc.data()!;
            userName = user.name;
            userEmail = user.email;
          }
        } else if (m.status === "invited") {
          // For invited members, user_id is the email
          userName = m.user_id;
          userEmail = m.user_id;
        }

        return {
          membership_id: m.membership_id,
          user_name: userName,
          user_email: userEmail,
          role: m.role,
          status: m.status,
          assigned_job_ids: m.assigned_job_ids,
          created_at: m.created_at.toDate().toISOString(),
        };
      })
    );

    return NextResponse.json({ members: enriched });
  } catch (error) {
    console.error("GET /api/team/list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
