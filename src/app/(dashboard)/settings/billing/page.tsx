"use client";

import { Check, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useApiQuery } from "@/hooks/use-api-query";

const plans = [
  { code: "starter", name: "Starter", price: "$49/mo", features: ["3 active jobs", "2 team members", "50 AI credits"] },
  { code: "growth", name: "Growth", price: "$99/mo", features: ["10 active jobs", "5 team members", "300 AI credits", "Custom workflows"] },
  { code: "pro", name: "Pro", price: "$249/mo", features: ["50 active jobs", "20 team members", "1000 AI credits", "Custom permissions"] },
];

export default function BillingSettingsPage() {
  const { data: tenantData, loading: tenantLoading } = useApiQuery<Record<string, unknown>>("/tenant/settings");
  const { data: metrics, loading: metricsLoading } = useApiQuery<Record<string, number>>("/analytics/dashboard");

  const currentPlan = (tenantData?.plan_code as string) ?? "starter";

  if (tenantLoading && metricsLoading) return <LoadingSkeleton variant="card" rows={3} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Usage</h1>

      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Current Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold">{metrics.totalActiveJobs ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.totalCandidates ?? 0}</p>
                <p className="text-xs text-muted-foreground">Candidates</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.interviewsThisWeek ?? 0}</p>
                <p className="text-xs text-muted-foreground">Interviews (week)</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{metrics.offersThisMonth ?? 0}</p>
                <p className="text-xs text-muted-foreground">Offers (month)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlan;
          return (
            <Card key={plan.code} className={isCurrent ? "border-brand-500 ring-1 ring-brand-500" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  {isCurrent && <Badge className="bg-brand-100 text-brand-700">Current</Badge>}
                </div>
                <p className="text-2xl font-bold">{plan.price}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={isCurrent ? "secondary" : "default"}
                  className="w-full"
                  disabled={isCurrent}
                >
                  {isCurrent ? "Current Plan" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Plan changes take effect immediately. Contact support for enterprise pricing.
      </p>
    </div>
  );
}
