"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/onboarding/progress-ring";
import { TaskList } from "@/components/onboarding/task-list";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useApiQuery, invalidateCache } from "@/hooks/use-api-query";

interface Task {
  task_id: string;
  title: string;
  assigned_role: string;
  status: string;
  priority: string;
  due_at: string;
}

export default function OnboardingPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const planId = params.planId as string;
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  const { data: tasks, loading, refetch } = useApiQuery<Task[]>(
    `/onboarding/plans/${planId}/tasks`,
    { transform: (raw: unknown) => (raw as { tasks: Task[] }).tasks ?? [] }
  );

  const allTasks = tasks ?? [];

  const handleComplete = async (taskId: string) => {
    setCompletingTask(taskId);
    const token = await getToken();
    if (!token || !tenantId) return;
    const res = await fetch(`/api/onboarding/tasks/${taskId}/complete?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    if (res.ok) {
      invalidateCache("/onboarding");
      refetch();
    }
    setCompletingTask(null);
  };

  const completed = allTasks.filter((t) => t.status === "completed").length;
  const progress = allTasks.length > 0 ? (completed / allTasks.length) * 100 : 0;

  if (loading) return <LoadingSkeleton variant="detail" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/onboarding")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Onboarding Plan</h1>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing progress={progress} />
        <div>
          <p className="text-sm font-medium">{completed} of {allTasks.length} tasks complete</p>
          <p className="text-xs text-muted-foreground">Plan: {planId.slice(-8)}</p>
        </div>
      </div>
      <TaskList tasks={allTasks} onComplete={handleComplete} />
    </div>
  );
}
