"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CandidateCard } from "@/components/candidates/candidate-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useApiQuery } from "@/hooks/use-api-query";

interface AppSummary {
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
  current_stage_name: string;
  score_total: number | null;
  score_status: string;
  parse_status: string;
  manual_review_required: boolean;
}

export default function CandidatesPage() {
  const [search, setSearch] = useState("");

  const { data: applications, loading } = useApiQuery<AppSummary[]>("/applications", {
    transform: (raw: unknown) => (raw as { applications: AppSummary[] }).applications,
  });

  const allApps = applications ?? [];
  const filtered = search
    ? allApps.filter(
        (a) =>
          a.candidate_name.toLowerCase().includes(search.toLowerCase()) ||
          a.candidate_email.toLowerCase().includes(search.toLowerCase()) ||
          a.job_title.toLowerCase().includes(search.toLowerCase())
      )
    : allApps;

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Candidates</h1>
      </div>

      <Input
        placeholder="Search by name, email, or job title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description="Candidates will appear here when they apply to your jobs."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((app) => (
            <CandidateCard
              key={app.application_id}
              applicationId={app.application_id}
              candidateName={app.candidate_name}
              candidateEmail={app.candidate_email}
              jobTitle={app.job_title}
              currentStageName={app.current_stage_name}
              scoreTotal={app.score_total}
              scoreStatus={app.score_status}
              parseStatus={app.parse_status}
              manualReviewRequired={app.manual_review_required}
            />
          ))}
        </div>
      )}
    </div>
  );
}
