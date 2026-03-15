import { FieldValue } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { periodKey } from "./dates";

export type UsageField =
  | "active_jobs"
  | "internal_users"
  | "candidate_applications"
  | "emails_sent"
  | "automation_runs"
  | "ai_credits_used";

export async function consumeUsage(
  tenantId: string,
  field: UsageField,
  amount: number = 1
): Promise<void> {
  const docId = `${tenantId}_${periodKey()}`;
  const ref = collections.usageCounters.doc(docId);

  await ref.set(
    {
      tenant_id: tenantId,
      period_key: periodKey(),
      [field]: FieldValue.increment(amount),
      updated_at: FieldValue.serverTimestamp(),
    } as Record<string, unknown>,
    { merge: true }
  );
}

export async function getUsage(
  tenantId: string,
  period?: string
): Promise<Record<UsageField, number>> {
  const key = period ?? periodKey();
  const docId = `${tenantId}_${key}`;
  const doc = await collections.usageCounters.doc(docId).get();

  const defaults: Record<UsageField, number> = {
    active_jobs: 0,
    internal_users: 0,
    candidate_applications: 0,
    emails_sent: 0,
    automation_runs: 0,
    ai_credits_used: 0,
  };

  if (!doc.exists) return defaults;

  const data = doc.data()!;
  return {
    active_jobs: data.active_jobs ?? 0,
    internal_users: data.internal_users ?? 0,
    candidate_applications: data.candidate_applications ?? 0,
    emails_sent: data.emails_sent ?? 0,
    automation_runs: data.automation_runs ?? 0,
    ai_credits_used: data.ai_credits_used ?? 0,
  };
}
