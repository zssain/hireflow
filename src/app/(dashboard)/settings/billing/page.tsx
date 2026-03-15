"use client";

import { CreditCard, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";

const plans = [
  { code: "starter", name: "Starter", price: "$49/mo", features: ["3 active jobs", "2 team members", "50 AI credits"] },
  { code: "growth", name: "Growth", price: "$99/mo", features: ["10 active jobs", "5 team members", "300 AI credits", "Custom workflows"] },
  { code: "pro", name: "Pro", price: "$249/mo", features: ["50 active jobs", "20 team members", "1000 AI credits", "Custom permissions"] },
];

export default function BillingSettingsPage() {
  const { tenantId } = useTenant();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Billing & Usage</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map(plan => (
          <Card key={plan.code} className={plan.code === "starter" ? "border-brand-500" : ""}>
            <CardHeader><CardTitle className="text-base">{plan.name}</CardTitle><p className="text-2xl font-bold">{plan.price}</p></CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-1.5">
                {plan.features.map(f => (<li key={f} className="flex items-center gap-2 text-sm"><Check className="h-3.5 w-3.5 text-green-500" />{f}</li>))}
              </ul>
              <Button variant={plan.code === "starter" ? "default" : "outline"} className="w-full">
                {plan.code === "starter" ? "Current Plan" : "Upgrade"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
