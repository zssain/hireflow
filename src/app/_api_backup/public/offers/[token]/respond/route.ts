import { NextRequest, NextResponse } from "next/server";
import { respondOfferSchema } from "@/lib/validators/schemas";
import { respondToOffer } from "@/modules/offers/offer.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const parsed = respondOfferSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    const offer = await respondToOffer(token, parsed.data.response);
    return NextResponse.json({ offer_id: offer.offer_id, status: offer.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
