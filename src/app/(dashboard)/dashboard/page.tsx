"use client";

import { useEffect, useState } from "react";
import { Briefcase, Users, Calendar, FileText } from "lucide-react";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { ActionCenter } from "@/components/dashboard/action-center";
import { PipelineSnapshot } from "@/components/dashboard/pipeline-snapshot";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface ActionItem {
  id: string;
  type: "review" | "interview" | "offer" | "overdue";
  title: string;
  description: string;
  href: string;
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const { tenantId, tenantName } = useTenant();
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [funnel, setFunnel] = useState<Array<{ name: string; count: number }>>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      const token = await getToken();
      if (!token) return;

      const [metricsRes, funnelRes, appsRes] = await Promise.all([
        globalThis.fetch(`/api/analytics/dashboard?tenant_id=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } }),
        globalThis.fetch(`/api/analytics/funnel?tenant_id=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } }),
        globalThis.fetch(`/api/applications?tenant_id=${tenantId}&status=active`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (funnelRes.ok) { const data = await funnelRes.json(); setFunnel(data.stages); }

      // Build action items from real data
      const actionItems: ActionItem[] = [];

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        const apps = appsData.applications ?? [];

        // Candidates needing manual review
        const needsReview = apps.filter((a: Record<string, unknown>) => a.manual_review_required && a.parse_status !== "processed");
        for (const app of needsReview.slice(0, 3)) {
          actionItems.push({
            id: `review-${app.application_id}`,
            type: "review",
            title: `Review: ${app.candidate_name}`,
            description: `Resume parse needs manual review for ${app.job_title}`,
            href: `/candidates/${app.application_id}`,
          });
        }

        // Pending scoring
        const pendingScore = apps.filter((a: Record<string, unknown>) => a.score_status === "pending");
        if (pendingScore.length > 0) {
          actionItems.push({
            id: "pending-scores",
            type: "review",
            title: `${pendingScore.length} candidate${pendingScore.length > 1 ? "s" : ""} pending scoring`,
            description: "Resumes awaiting processing",
            href: "/candidates",
          });
        }
      }

      setActions(actionItems);
      setLoading(false);
    }
    load();
  }, [tenantId, getToken]);

  if (loading) return <LoadingSkeleton variant="card" rows={4} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Welcome back{tenantName ? `, ${tenantName}` : ""}</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <WidgetCard title="Active Jobs" value={metrics?.totalActiveJobs ?? 0} icon={Briefcase} index={0} />
        <WidgetCard title="Total Candidates" value={metrics?.totalCandidates ?? 0} icon={Users} index={1} />
        <WidgetCard title="Interviews This Week" value={metrics?.interviewsThisWeek ?? 0} icon={Calendar} index={2} />
        <WidgetCard title="Offers This Month" value={metrics?.offersThisMonth ?? 0} icon={FileText} index={3} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ActionCenter items={actions} />
        {funnel.length > 0 && <PipelineSnapshot stages={funnel} />}
      </div>
    </div>
  );
}
