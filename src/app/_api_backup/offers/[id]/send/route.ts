import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { getOffer, sendOffer } from "@/modules/offers/offer.service";
import { getApplication } from "@/modules/applications/application.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "send_offers");

    const { id } = await params;
    const offer = await getOffer(id);
    if (!offer || offer.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const application = await getApplication(offer.application_id);
    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    await sendOffer(id, application.candidate_email);
    return NextResponse.json({ offer_id: id, status: "sent" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("permission") ? 403 : 500 });
  }
}
