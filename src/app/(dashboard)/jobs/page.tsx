"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useMembership } from "@/hooks/use-membership";
import { useApiQuery } from "@/hooks/use-api-query";

interface JobSummary {
  job_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  status: string;
}

export default function JobsPage() {
  const router = useRouter();
  const { can } = useMembership();
  const [activeTab, setActiveTab] = useState("all");

  const { data: jobs, loading } = useApiQuery<JobSummary[]>("/jobs", {
    transform: (raw: unknown) => (raw as { jobs: JobSummary[] }).jobs,
  });

  const allJobs = jobs ?? [];
  const filteredJobs = activeTab === "all" ? allJobs : allJobs.filter((j) => j.status === activeTab);

  if (loading) return <LoadingSkeleton variant="card" rows={6} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        {can("create_edit_jobs") && (
          <Button onClick={() => router.push("/jobs/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({allJobs.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({allJobs.filter((j) => j.status === "open").length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({allJobs.filter((j) => j.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({allJobs.filter((j) => j.status === "closed").length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredJobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs yet"
          description="Create your first job posting to start receiving applications."
          actionLabel={can("create_edit_jobs") ? "Create Job" : undefined}
          onAction={can("create_edit_jobs") ? () => router.push("/jobs/new") : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.job_id}
              jobId={job.job_id}
              title={job.title}
              department={job.department}
              location={job.location}
              employmentType={job.employment_type}
              status={job.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
