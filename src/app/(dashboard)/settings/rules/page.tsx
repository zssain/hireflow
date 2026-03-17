"use client";

import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useApiQuery } from "@/hooks/use-api-query";

interface Rule {
  rule_id: string;
  name: string;
  trigger: string;
  enabled: boolean;
  priority: number;
}

export default function RuleSettingsPage() {
  const { data: rules } = useApiQuery<Rule[]>("/rules", {
    transform: (raw: unknown) => (raw as { rules: Rule[] }).rules,
  });

  const allRules = rules ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workflow Rules</h1>
      {allRules.length === 0 ? (
        <EmptyState icon={Zap} title="No custom rules" description="Default automation rules are active. Create custom rules to automate your hiring workflow." />
      ) : (
        <div className="space-y-2">
          {allRules.map((r) => (
            <Card key={r.rule_id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">Trigger: {r.trigger}</p>
                </div>
                <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "Active" : "Disabled"}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
