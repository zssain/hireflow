"use client";

import { GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function PipelineSettingsPage() {
  const defaultStages = ["Applied", "Screening", "Interview", "Offer", "Hired"];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pipeline Templates</h1>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><GitBranch className="h-4 w-4" />Default Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {defaultStages.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1">
                <Badge variant="secondary">{i + 1}. {stage}</Badge>
                {i < defaultStages.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
