"use client";

import { CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Task {
  task_id: string;
  title: string;
  assigned_role: string;
  status: string;
  priority: string;
  due_at: string;
}

interface TaskListProps {
  tasks: Task[];
  onComplete?: (taskId: string) => void;
}

const statusIcons: Record<string, typeof Circle> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  overdue: AlertTriangle,
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-zinc-100 text-zinc-700",
};

export function TaskList({ tasks, onComplete }: TaskListProps) {
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const Icon = statusIcons[task.status] ?? Circle;
        return (
          <div key={task.task_id} className={cn("flex items-center gap-3 rounded-lg border p-3", task.status === "completed" && "opacity-60")}>
            <Icon className={cn("h-5 w-5 shrink-0", task.status === "completed" ? "text-green-500" : task.status === "overdue" ? "text-red-500" : "text-muted-foreground")} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", task.status === "completed" && "line-through")}>{task.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{task.assigned_role}</span>
                <Badge variant="secondary" className={cn("text-xs", priorityColors[task.priority])}>{task.priority}</Badge>
                <span className="text-xs text-muted-foreground">{new Date(task.due_at).toLocaleDateString()}</span>
              </div>
            </div>
            {task.status !== "completed" && task.status !== "skipped" && onComplete && (
              <Button size="sm" variant="outline" onClick={() => onComplete(task.task_id)}>Complete</Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
