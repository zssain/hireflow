"use client";

import { motion } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stage { name: string; count: number; }
interface PipelineSnapshotProps { stages: Stage[]; }

export function PipelineSnapshot({ stages }: PipelineSnapshotProps) {
  const max = Math.max(...stages.map(s => s.count), 1);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Pipeline Overview</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {stages.map((stage, i) => (
          <div key={stage.name} className="space-y-1">
            <div className="flex justify-between text-sm"><span>{stage.name}</span><span className="font-medium">{stage.count}</span></div>
            <div className="h-2 rounded-full bg-muted">
              <motion.div className="h-full rounded-full bg-brand-500" initial={{ width: 0 }} animate={{ width: `${(stage.count / max) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
