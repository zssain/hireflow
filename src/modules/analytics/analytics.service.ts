import { Timestamp } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/firestore";
import { dateKey } from "@/lib/utils/dates";
import type { DailyMetrics } from "./analytics.types";

export async function getDashboardMetrics(tenantId: string): Promise<{
  totalActiveJobs: number;
  totalCandidates: number;
  interviewsThisWeek: number;
  offersThisMonth: number;
  recentApplications: number;
}> {
  const [jobsSnap, appsSnap, interviewsSnap, offersSnap] = await Promise.all([
    collections.jobs.where("tenant_id", "==", tenantId).where("status", "==", "open").get(),
    collections.applications.where("tenant_id", "==", tenantId).where("status", "==", "active").get(),
    collections.interviews.where("tenant_id", "==", tenantId).where("status", "==", "booked").get(),
    collections.offers.where("tenant_id", "==", tenantId).get(),
  ]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const interviewsThisWeek = interviewsSnap.docs.filter((d) => {
    const start = d.data().scheduled_start;
    return start && start.toDate() >= weekAgo;
  }).length;

  const offersThisMonth = offersSnap.docs.filter((d) => d.data().created_at.toDate() >= monthAgo).length;
  const recentApps = appsSnap.docs.filter((d) => d.data().created_at.toDate() >= weekAgo).length;

  return {
    totalActiveJobs: jobsSnap.size,
    totalCandidates: appsSnap.size,
    interviewsThisWeek,
    offersThisMonth,
    recentApplications: recentApps,
  };
}

export async function getFunnelMetrics(tenantId: string, jobId?: string): Promise<{
  stages: Array<{ name: string; count: number }>;
}> {
  let query = collections.applications.where("tenant_id", "==", tenantId).where("status", "==", "active") as FirebaseFirestore.Query;
  if (jobId) query = query.where("job_id", "==", jobId);

  const snapshot = await query.get();
  const stageCounts: Record<string, number> = {};

  for (const doc of snapshot.docs) {
    const stageName = doc.data().current_stage_name ?? "Unknown";
    stageCounts[stageName] = (stageCounts[stageName] ?? 0) + 1;
  }

  return {
    stages: Object.entries(stageCounts).map(([name, count]) => ({ name, count })),
  };
}

export async function recordDailyMetrics(tenantId: string): Promise<void> {
  const today = dateKey();
  const docId = `${tenantId}_${today}`;

  const [apps, interviews, offers, tasks] = await Promise.all([
    collections.applications.where("tenant_id", "==", tenantId).get(),
    collections.interviews.where("tenant_id", "==", tenantId).where("status", "==", "booked").get(),
    collections.offers.where("tenant_id", "==", tenantId).where("status", "==", "sent").get(),
    collections.onboardingTasks.where("tenant_id", "==", tenantId).where("status", "==", "completed").get(),
  ]);

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const metrics: DailyMetrics = {
    tenant_id: tenantId,
    date_key: today,
    applications_created: apps.docs.filter((d) => d.data().created_at.toDate() >= todayDate).length,
    interviews_booked: interviews.docs.filter((d) => d.data().updated_at.toDate() >= todayDate).length,
    offers_sent: offers.docs.filter((d) => {
      const sent = d.data().sent_at;
      return sent && sent.toDate() >= todayDate;
    }).length,
    offers_accepted: 0,
    onboarding_tasks_completed: tasks.docs.filter((d) => {
      const completed = d.data().completed_at;
      return completed && completed.toDate() >= todayDate;
    }).length,
    created_at: Timestamp.now(),
  };

  await collections.dailyMetrics.doc(docId).set(metrics, { merge: true });
}
