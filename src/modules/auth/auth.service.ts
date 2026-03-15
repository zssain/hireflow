import { getAdminAuth } from "@/lib/firebase/admin";
import { collections } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase-admin/firestore";
import type { User } from "@/modules/memberships/membership.types";

export async function verifyIdToken(token: string) {
  return getAdminAuth().verifyIdToken(token);
}

export async function getOrCreateUser(
  uid: string,
  email: string,
  name: string,
  photoUrl?: string
): Promise<User> {
  const userRef = collections.users.doc(uid);
  const doc = await userRef.get();

  if (doc.exists) {
    return doc.data()!;
  }

  const now = Timestamp.now();
  const user: User = {
    user_id: uid,
    name,
    email,
    photo_url: photoUrl ?? "",
    created_at: now,
    updated_at: now,
  };

  await userRef.set(user);
  return user;
}

export async function getActiveMembership(userId: string, tenantId: string) {
  const snapshot = await collections.memberships
    .where("user_id", "==", userId)
    .where("tenant_id", "==", tenantId)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  return snapshot.docs[0].data();
}
