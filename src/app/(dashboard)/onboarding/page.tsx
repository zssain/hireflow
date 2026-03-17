"use client";

import { useRouter } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/onboarding/progress-ring";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useApiQuery } from "@/hooks/use-api-query";

interface PlanSummary {
  plan_id: string;
  status: string;
  template_code: string;
  start_date: string;
}

export default function OnboardingPage() {
  const router = useRouter();

  const { data: plans, loading } = useApiQuery<PlanSummary[]>("/onboarding/plans", {
    transform: (raw: unknown) => (raw as { plans: PlanSummary[] }).plans,
  });

  const allPlans = plans ?? [];

  if (loading) return <LoadingSkeleton variant="card" rows={3} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Onboarding</h1>
      {allPlans.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="No onboarding plans" description="Onboarding plans are created automatically when an offer is accepted." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allPlans.map((plan) => (
            <Card key={plan.plan_id} className="cursor-pointer hover:shadow-md" onClick={() => router.push(`/onboarding/${plan.plan_id}`)}>
              <CardContent className="flex items-center gap-4 p-4">
                <ProgressRing progress={plan.status === "completed" ? 100 : 40} size={56} />
                <div>
                  <p className="font-medium">Plan {plan.plan_id.slice(-6)}</p>
                  <p className="text-xs text-muted-foreground">Start: {new Date(plan.start_date).toLocaleDateString()}</p>
                  <Badge variant="secondary" className="mt-1 text-xs">{plan.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
