"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface Rule { rule_id: string; name: string; trigger: string; enabled: boolean; priority: number; }

export default function RuleSettingsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [rules, setRules] = useState<Rule[]>([]);

  useEffect(() => {
    async function load() {
      if (!tenantId) return;
      const token = await getToken();
      if (!token) return;
      const res = await globalThis.fetch(`/api/rules?tenant_id=${tenantId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setRules(data.rules); }
    }
    load();
  }, [tenantId, getToken]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workflow Rules</h1>
      {rules.length === 0 ? (
        <EmptyState icon={Zap} title="No custom rules" description="Default automation rules are active. Create custom rules to automate your hiring workflow." />
      ) : (
        <div className="space-y-2">
          {rules.map(r => (
            <Card key={r.rule_id}><CardContent className="flex items-center justify-between p-4">
              <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted-foreground">Trigger: {r.trigger}</p></div>
              <Badge variant={r.enabled ? "default" : "secondary"}>{r.enabled ? "Active" : "Disabled"}</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
