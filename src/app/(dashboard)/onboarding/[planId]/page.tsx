"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProgressRing } from "@/components/onboarding/progress-ring";
import { TaskList } from "@/components/onboarding/task-list";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface Task { task_id: string; title: string; assigned_role: string; status: string; priority: string; due_at: string; }

export default function OnboardingPlanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const planId = params.planId as string;

  useEffect(() => { setLoading(false); }, [planId, tenantId, getToken]);

  const handleComplete = async (taskId: string) => {
    const token = await getToken();
    if (!token || !tenantId) return;
    const res = await globalThis.fetch(`/api/onboarding/tasks/${taskId}/complete?tenant_id=${tenantId}`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ tenant_id: tenantId }),
    });
    if (res.ok) { setTasks(prev => prev.map(t => t.task_id === taskId ? { ...t, status: "completed" } : t)); }
  };

  const completed = tasks.filter(t => t.status === "completed").length;
  const progress = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
  if (loading) return <LoadingSkeleton variant="detail" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/onboarding")}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Onboarding Plan</h1>
      </div>
      <div className="flex items-center gap-4">
        <ProgressRing progress={progress} />
        <div><p className="text-sm font-medium">{completed} of {tasks.length} tasks complete</p><p className="text-xs text-muted-foreground">Plan: {planId.slice(-8)}</p></div>
      </div>
      <TaskList tasks={tasks} onComplete={handleComplete} />
    </div>
  );
}
