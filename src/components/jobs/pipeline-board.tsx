"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PipelineStage {
  stage_id: string;
  name: string;
  order: number;
}

interface ApplicationSummary {
  application_id: string;
  candidate_name: string;
  score_total: number | null;
  current_stage_id: string;
}

interface PipelineBoardProps {
  stages: PipelineStage[];
  applications: ApplicationSummary[];
  onApplicationClick?: (applicationId: string) => void;
}

export function PipelineBoard({ stages, applications, onApplicationClick }: PipelineBoardProps) {
  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const getStageApplications = (stageId: string) =>
    applications.filter((a) => a.current_stage_id === stageId);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {sortedStages.map((stage, index) => {
        const stageApps = getStageApplications(stage.stage_id);

        return (
          <motion.div
            key={stage.stage_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="w-64 shrink-0"
          >
            <div className="rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between border-b px-3 py-2">
                <h3 className="text-sm font-medium">{stage.name}</h3>
                <Badge variant="secondary" className="text-xs">
                  {stageApps.length}
                </Badge>
              </div>
              <div className="space-y-2 p-2 min-h-[100px]">
                {stageApps.map((app) => (
                  <Card
                    key={app.application_id}
                    className="cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => onApplicationClick?.(app.application_id)}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm font-medium truncate">{app.candidate_name}</p>
                      {app.score_total !== null && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <div className="h-1.5 flex-1 rounded-full bg-muted">
                            <motion.div
                              className="h-full rounded-full bg-brand-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${app.score_total}%` }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{app.score_total}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {stageApps.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">No candidates</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
