"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InterviewCard } from "@/components/interviews/interview-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

interface InterviewSummary {
  interview_id: string;
  round_name: string;
  mode: string;
  duration_minutes: number;
  status: string;
  scheduled_start: string | null;
}

export default function InterviewsPage() {
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    async function load() {
      if (!tenantId) { setLoading(false); return; }
      const token = await getToken();
      if (!token) { setLoading(false); return; }

      const res = await globalThis.fetch(`/api/interviews/list?tenant_id=${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setInterviews(data.interviews);
      }
      setLoading(false);
    }
    load();
  }, [tenantId, getToken]);

  const filtered = tab === "all" ? interviews : interviews.filter((i) => i.status === tab);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Interviews</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({interviews.length})</TabsTrigger>
          <TabsTrigger value="booked">
            Booked ({interviews.filter((i) => i.status === "booked").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({interviews.filter((i) => i.status === "completed").length})
          </TabsTrigger>
          <TabsTrigger value="draft">
            Draft ({interviews.filter((i) => i.status === "draft").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No interviews"
          description="Schedule interviews from the candidate detail page."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <InterviewCard
              key={i.interview_id}
              interviewId={i.interview_id}
              roundName={i.round_name}
              mode={i.mode}
              durationMinutes={i.duration_minutes}
              status={i.status}
              scheduledStart={i.scheduled_start}
            />
          ))}
        </div>
      )}
    </div>
  );
}
