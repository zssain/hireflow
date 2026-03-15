import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { generateId, generateToken } from "@/lib/utils/ids";
import { sendEmail } from "@/lib/adapters/email.adapter";
import type { Membership, MembershipRole } from "./membership.types";

interface InviteMemberParams {
  tenantId: string;
  email: string;
  role: MembershipRole;
  invitedByMembershipId: string;
  assignedJobIds?: string[];
}

interface InviteResult {
  membership: Membership;
  inviteToken: string;
}

export async function inviteMember(params: InviteMemberParams): Promise<InviteResult> {
  // Check if already a member
  const existing = await collections.memberships
    .where("tenant_id", "==", params.tenantId)
    .where("status", "in", ["invited", "active"])
    .get();

  const alreadyMember = existing.docs.find((doc) => {
    const data = doc.data();
    // We need to check by email via users collection, but for invited members
    // we store a placeholder user_id. For simplicity, check membership count.
    return data.user_id === params.email; // For invited, user_id = email temporarily
  });

  if (alreadyMember) {
    throw new Error("User is already a member or has a pending invite");
  }

  const membershipId = generateId("mb");
  const inviteToken = generateToken();
  const now = Timestamp.now();

  const membership: Membership = {
    membership_id: membershipId,
    tenant_id: params.tenantId,
    user_id: params.email, // Placeholder until invite accepted
    role: params.role,
    status: "invited",
    permissions_override: {},
    assigned_job_ids: params.assignedJobIds ?? [],
    invited_by_membership_id: params.invitedByMembershipId,
    created_at: now,
    updated_at: now,
  };

  const batch = collections.memberships.firestore.batch();
  batch.set(collections.memberships.doc(membershipId), membership);

  // Store invite token for lookup
  // We'll use a simple approach: store token in a separate doc
  batch.set(
    collections.memberships.firestore.collection("invite_tokens").doc(inviteToken),
    {
      membership_id: membershipId,
      tenant_id: params.tenantId,
      email: params.email,
      created_at: now,
    }
  );

  await batch.commit();

  // Send invite email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendEmail({
    to: params.email,
    subject: "You've been invited to join a team on HireFlow",
    html: `
      <h2>You've been invited!</h2>
      <p>You've been invited to join a team on HireFlow as a <strong>${params.role.replace("_", " ")}</strong>.</p>
      <p><a href="${appUrl}/invite/${inviteToken}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
      <p>This link will expire in 7 days.</p>
    `,
  });

  return { membership, inviteToken };
}

export async function acceptInvite(
  inviteToken: string,
  userId: string
): Promise<Membership> {
  const tokenDoc = await collections.memberships.firestore
    .collection("invite_tokens")
    .doc(inviteToken)
    .get();

  if (!tokenDoc.exists) {
    throw new Error("Invalid or expired invite token");
  }

  const tokenData = tokenDoc.data()!;
  const membershipRef = collections.memberships.doc(tokenData.membership_id);
  const membershipDoc = await membershipRef.get();

  if (!membershipDoc.exists) {
    throw new Error("Membership not found");
  }

  const membership = membershipDoc.data()!;
  if (membership.status !== "invited") {
    throw new Error("Invite already accepted or revoked");
  }

  const now = Timestamp.now();
  await membershipRef.update({
    user_id: userId,
    status: "active",
    updated_at: now,
  });

  // Delete the token
  await tokenDoc.ref.delete();

  return { ...membership, user_id: userId, status: "active", updated_at: now };
}

export async function updateMembership(
  membershipId: string,
  updates: Partial<Pick<Membership, "role" | "status" | "permissions_override" | "assigned_job_ids">>
): Promise<void> {
  await collections.memberships.doc(membershipId).update({
    ...updates,
    updated_at: Timestamp.now(),
  });
}

export async function listMemberships(tenantId: string): Promise<Membership[]> {
  const snapshot = await collections.memberships
    .where("tenant_id", "==", tenantId)
    .where("status", "in", ["active", "invited"])
    .get();

  return snapshot.docs.map((doc) => doc.data());
}

export async function getMembership(membershipId: string): Promise<Membership | null> {
  const doc = await collections.memberships.doc(membershipId).get();
  return doc.exists ? doc.data()! : null;
}

export async function getMembershipsByUserId(userId: string): Promise<Membership[]> {
  const snapshot = await collections.memberships
    .where("user_id", "==", userId)
    .where("status", "==", "active")
    .get();

  return snapshot.docs.map((doc) => doc.data());
}
