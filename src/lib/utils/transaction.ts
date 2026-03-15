import { getAdminDb } from "@/lib/firebase/admin";

export async function safeTransaction<T>(
  fn: (transaction: FirebaseFirestore.Transaction) => Promise<T>
): Promise<T> {
  return getAdminDb().runTransaction(fn);
}
