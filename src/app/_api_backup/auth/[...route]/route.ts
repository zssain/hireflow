import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, getOrCreateUser } from "@/modules/auth/auth.service";
import { getMembershipsByUserId } from "@/modules/memberships/membership.service";
import { acceptInvite } from "@/modules/memberships/membership.service";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/auth/", "");

  switch (path) {
    case "session":
      return handleSession(req);
    case "accept-invite":
      return handleAcceptInvite(req);
    default:
      return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

async function handleSession(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const decoded = await verifyIdToken(authHeader.slice(7));
    const user = await getOrCreateUser(
      decoded.uid,
      decoded.email ?? "",
      decoded.name ?? decoded.email ?? "",
      decoded.picture
    );

    const memberships = await getMembershipsByUserId(decoded.uid);

    return NextResponse.json({
      user,
      memberships: memberships.map((m) => ({
        membership_id: m.membership_id,
        tenant_id: m.tenant_id,
        role: m.role,
        status: m.status,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}

async function handleAcceptInvite(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization" }, { status: 401 });
    }

    const decoded = await verifyIdToken(authHeader.slice(7));
    const body = await req.json();
    const { invite_token } = body;

    if (!invite_token) {
      return NextResponse.json({ error: "Missing invite_token" }, { status: 400 });
    }

    // Ensure user doc exists
    await getOrCreateUser(
      decoded.uid,
      decoded.email ?? "",
      decoded.name ?? decoded.email ?? ""
    );

    const membership = await acceptInvite(invite_token, decoded.uid);

    return NextResponse.json({
      membership_id: membership.membership_id,
      tenant_id: membership.tenant_id,
      role: membership.role,
      status: membership.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
