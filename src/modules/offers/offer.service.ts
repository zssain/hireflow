import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId, generateToken } from "@/lib/utils/ids";
import { emitEvent } from "@/lib/events/emitter";
import { sendEmail, renderTemplate } from "@/lib/adapters/email.adapter";
import { consumeUsage } from "@/lib/utils/usage";
import type { Offer } from "./offer.types";

interface CreateOfferParams {
  tenantId: string;
  applicationId: string;
  candidateId: string;
  jobId: string;
  templateCode: string;
  generatedFields: Record<string, string>;
  createdByMembershipId: string;
}

export async function createOffer(params: CreateOfferParams): Promise<Offer> {
  const offerId = generateId("ofr");
  const responseToken = generateToken();
  const now = Timestamp.now();

  const offer: Offer = {
    offer_id: offerId,
    tenant_id: params.tenantId,
    application_id: params.applicationId,
    candidate_id: params.candidateId,
    job_id: params.jobId,
    status: "draft",
    approval_state: "pending",
    template_code: params.templateCode,
    generated_fields: params.generatedFields as Offer["generated_fields"],
    response_token: responseToken,
    sent_at: null,
    viewed_at: null,
    accepted_at: null,
    declined_at: null,
    created_by_membership_id: params.createdByMembershipId,
    created_at: now,
    updated_at: now,
  };

  await collections.offers.doc(offerId).set(offer);

  await emitEvent({
    tenantId: params.tenantId,
    trigger: "offer.created",
    payload: { entity_type: "offer", entity_id: offerId, job_id: params.jobId, application_id: params.applicationId },
    actorMembershipId: params.createdByMembershipId,
  });

  return offer;
}

export async function getOffer(offerId: string): Promise<Offer | null> {
  const doc = await collections.offers.doc(offerId).get();
  return doc.exists ? doc.data()! : null;
}

export async function getOfferByToken(token: string): Promise<Offer | null> {
  const snapshot = await collections.offers
    .where("response_token", "==", token)
    .limit(1)
    .get();
  return snapshot.empty ? null : snapshot.docs[0].data();
}

export async function approveOffer(offerId: string): Promise<void> {
  const offer = await getOffer(offerId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "draft" && offer.status !== "pending_approval") {
    throw new Error("Offer cannot be approved in current status");
  }

  await collections.offers.doc(offerId).update({
    status: "approved",
    approval_state: "approved",
    updated_at: Timestamp.now(),
  });
}

export async function sendOffer(offerId: string, candidateEmail: string): Promise<void> {
  const offer = await getOffer(offerId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "approved") throw new Error("Only approved offers can be sent");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Get email template
  const templateSnap = await collections.emailTemplates
    .where("tenant_id", "==", offer.tenant_id)
    .where("code", "==", "offer_letter")
    .limit(1)
    .get();

  let html: string;
  if (!templateSnap.empty) {
    const template = templateSnap.docs[0].data();
    html = renderTemplate(template.body_html, offer.generated_fields);
  } else {
    html = `
      <h2>Congratulations, ${offer.generated_fields.candidate_name}!</h2>
      <p>We're excited to offer you the position of <strong>${offer.generated_fields.job_title}</strong>.</p>
      <p>Salary: ${offer.generated_fields.salary}</p>
      <p>Joining Date: ${offer.generated_fields.joining_date}</p>
      <p><a href="${appUrl}/offer/${offer.response_token}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">View & Respond to Offer</a></p>
    `;
  }

  await sendEmail({
    to: candidateEmail,
    subject: `Offer for ${offer.generated_fields.job_title}`,
    html,
  });

  await collections.offers.doc(offerId).update({
    status: "sent",
    sent_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  });

  await consumeUsage(offer.tenant_id, "emails_sent");

  await emitEvent({
    tenantId: offer.tenant_id,
    trigger: "offer.sent",
    payload: { entity_type: "offer", entity_id: offerId, job_id: offer.job_id },
  });
}

export async function respondToOffer(
  token: string,
  response: "accept" | "decline"
): Promise<Offer> {
  const offer = await getOfferByToken(token);
  if (!offer) throw new Error("Invalid offer token");
  if (offer.status !== "sent" && offer.status !== "viewed") {
    throw new Error("Offer cannot be responded to in current status");
  }

  const now = Timestamp.now();
  const updates: Record<string, unknown> = {
    status: response === "accept" ? "accepted" : "declined",
    updated_at: now,
  };

  if (response === "accept") {
    updates.accepted_at = now;
  } else {
    updates.declined_at = now;
  }

  await collections.offers.doc(offer.offer_id).update(updates);

  const trigger = response === "accept" ? "offer.accepted" : "offer.declined";
  await emitEvent({
    tenantId: offer.tenant_id,
    trigger,
    payload: {
      entity_type: "offer",
      entity_id: offer.offer_id,
      job_id: offer.job_id,
      application_id: offer.application_id,
      candidate_id: offer.candidate_id,
    },
  });

  return { ...offer, status: response === "accept" ? "accepted" : "declined" };
}

export async function listOffers(tenantId: string, filters?: { status?: string }): Promise<Offer[]> {
  let query = collections.offers.where("tenant_id", "==", tenantId) as FirebaseFirestore.Query<Offer>;
  if (filters?.status) query = query.where("status", "==", filters.status);

  const snapshot = await query.orderBy("created_at", "desc").get();
  return snapshot.docs.map((doc) => doc.data());
}
