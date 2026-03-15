"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCard } from "@/components/jobs/job-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useMembership } from "@/hooks/use-membership";

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
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const { can } = useMembership();
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    async function fetchJobs() {
      if (!tenantId) { setLoading(false); return; }
      const token = await getToken();
      if (!token) { setLoading(false); return; }

      const res = await fetch(`/api/jobs?tenant_id=${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
      }
      setLoading(false);
    }
    fetchJobs();
  }, [tenantId, getToken]);

  const filteredJobs = activeTab === "all" ? jobs : jobs.filter((j) => j.status === activeTab);

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
          <TabsTrigger value="all">All ({jobs.length})</TabsTrigger>
          <TabsTrigger value="open">Open ({jobs.filter((j) => j.status === "open").length})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({jobs.filter((j) => j.status === "draft").length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({jobs.filter((j) => j.status === "closed").length})</TabsTrigger>
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
