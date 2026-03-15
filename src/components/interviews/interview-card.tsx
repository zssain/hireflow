"use client";

import { Calendar, Clock, Users, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface InterviewCardProps {
  interviewId: string;
  roundName: string;
  candidateName?: string;
  mode: string;
  durationMinutes: number;
  status: string;
  scheduledStart?: string | null;
  onSelect?: () => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  slot_sent: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-orange-100 text-orange-700",
};

export function InterviewCard({ roundName, candidateName, mode, durationMinutes, status, scheduledStart, onSelect }: InterviewCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">{roundName}</h3>
            {candidateName && <p className="text-sm text-muted-foreground">{candidateName}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Video className="h-3 w-3" />{mode.replace("_", " ")}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{durationMinutes}min</span>
              {scheduledStart && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(scheduledStart).toLocaleDateString()}</span>}
            </div>
          </div>
          <Badge variant="secondary" className={statusColors[status]}>{status}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
