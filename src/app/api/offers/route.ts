import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, isAuthContext } from "@/modules/auth/auth.middleware";
import { assertPermission } from "@/lib/permissions/check";
import { createOfferSchema } from "@/lib/validators/schemas";
import { createOffer, listOffers } from "@/modules/offers/offer.service";
import { getApplication } from "@/modules/applications/application.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (!isAuthContext(auth)) return auth;
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const offers = await listOffers(auth.tenantId, { status });
  return NextResponse.json({ offers });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!isAuthContext(auth)) return auth;
    assertPermission(auth.membership, "create_offers");

    const body = await req.json();
    const parsed = createOfferSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

    const application = await getApplication(parsed.data.application_id);
    if (!application || application.tenant_id !== auth.tenantId) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const offer = await createOffer({
      tenantId: auth.tenantId,
      applicationId: parsed.data.application_id,
      candidateId: application.candidate_id,
      jobId: application.job_id,
      templateCode: parsed.data.template_code,
      generatedFields: parsed.data.generated_fields,
      createdByMembershipId: auth.membership.membership_id,
    });

    return NextResponse.json({ offer_id: offer.offer_id, status: offer.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: message.includes("permission") ? 403 : 500 });
  }
}
