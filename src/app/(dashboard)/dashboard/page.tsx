"use client";

import { Briefcase, Users, Calendar, FileText } from "lucide-react";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { ActionCenter } from "@/components/dashboard/action-center";
import { PipelineSnapshot } from "@/components/dashboard/pipeline-snapshot";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useTenant } from "@/hooks/use-tenant";
import { useApiQuery } from "@/hooks/use-api-query";

interface ActionItem {
  id: string;
  type: "review" | "interview" | "offer" | "overdue";
  title: string;
  description: string;
  href: string;
}

export default function DashboardPage() {
  const { tenantName } = useTenant();

  const { data: metrics, loading: metricsLoading } = useApiQuery<Record<string, number>>(
    "/analytics/dashboard"
  );

  const { data: funnel, loading: funnelLoading } = useApiQuery<Array<{ name: string; count: number }>>(
    "/analytics/funnel",
    { transform: (raw: unknown) => (raw as { stages: Array<{ name: string; count: number }> }).stages }
  );

  const { data: actions, loading: actionsLoading } = useApiQuery<ActionItem[]>(
    "/applications?status=active",
    {
      transform: (raw: unknown) => {
        const apps = (raw as { applications: Record<string, unknown>[] }).applications ?? [];
        const items: ActionItem[] = [];

        const needsReview = apps.filter((a) => a.manual_review_required && a.parse_status !== "processed");
        for (const app of needsReview.slice(0, 3)) {
          items.push({
            id: `review-${app.application_id}`,
            type: "review",
            title: `Review: ${app.candidate_name}`,
            description: `Resume parse needs manual review for ${app.job_title}`,
            href: `/candidates/${app.application_id}`,
          });
        }

        const pendingScore = apps.filter((a) => a.score_status === "pending");
        if (pendingScore.length > 0) {
          items.push({
            id: "pending-scores",
            type: "review",
            title: `${pendingScore.length} candidate${pendingScore.length > 1 ? "s" : ""} pending scoring`,
            description: "Resumes awaiting processing",
            href: "/candidates",
          });
        }

        return items;
      },
    }
  );

  const loading = metricsLoading && funnelLoading && actionsLoading;

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
        <ActionCenter items={actions ?? []} />
        {funnel && funnel.length > 0 && <PipelineSnapshot stages={funnel} />}
      </div>
    </div>
  );
}
