"use client";

import { BarChart3 } from "lucide-react";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { PipelineSnapshot } from "@/components/dashboard/pipeline-snapshot";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useApiQuery } from "@/hooks/use-api-query";

export default function AnalyticsPage() {
  const { data: metrics, loading: metricsLoading } = useApiQuery<Record<string, number>>(
    "/analytics/dashboard"
  );

  const { data: funnel, loading: funnelLoading } = useApiQuery<Array<{ name: string; count: number }>>(
    "/analytics/funnel",
    { transform: (raw: unknown) => (raw as { stages: Array<{ name: string; count: number }> }).stages }
  );

  if (metricsLoading && funnelLoading) return <LoadingSkeleton variant="card" rows={6} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WidgetCard title="Recent Applications" value={metrics?.recentApplications ?? 0} icon={BarChart3} index={0} description="Last 7 days" />
        <WidgetCard title="Interviews This Week" value={metrics?.interviewsThisWeek ?? 0} icon={BarChart3} index={1} />
        <WidgetCard title="Offers This Month" value={metrics?.offersThisMonth ?? 0} icon={BarChart3} index={2} />
      </div>
      {funnel && funnel.length > 0 && <PipelineSnapshot stages={funnel} />}
    </div>
  );
}
