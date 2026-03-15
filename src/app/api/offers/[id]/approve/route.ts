import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { getOffer, approveOffer } from "@/modules/offers/offer.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "approve_offers");

    const { id } = await params;
    const offer = await getOffer(id);
    if (!offer || offer.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await approveOffer(id);
    return NextResponse.json({ offer_id: id, status: "approved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("permission") ? 403 : 400 });
  }
}
