"use client";

import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { WidgetCard } from "@/components/dashboard/widget-card";
import { PipelineSnapshot } from "@/components/dashboard/pipeline-snapshot";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);
  const [funnel, setFunnel] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!tenantId) { setLoading(false); return; }
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const [m, f] = await Promise.all([
        globalThis.fetch(`/api/analytics/dashboard?tenant_id=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } }),
        globalThis.fetch(`/api/analytics/funnel?tenant_id=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (m.ok) setMetrics(await m.json());
      if (f.ok) setFunnel((await f.json()).stages);
      setLoading(false);
    }
    load();
  }, [tenantId, getToken]);

  if (loading) return <LoadingSkeleton variant="card" rows={6} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <WidgetCard title="Recent Applications" value={metrics?.recentApplications ?? 0} icon={BarChart3} index={0} description="Last 7 days" />
        <WidgetCard title="Interviews This Week" value={metrics?.interviewsThisWeek ?? 0} icon={BarChart3} index={1} />
        <WidgetCard title="Offers This Month" value={metrics?.offersThisMonth ?? 0} icon={BarChart3} index={2} />
      </div>
      {funnel.length > 0 && <PipelineSnapshot stages={funnel} />}
    </div>
  );
}
