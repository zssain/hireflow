"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Globe, Lock, Play, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineBoard } from "@/components/jobs/pipeline-board";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useMembership } from "@/hooks/use-membership";

interface JobDetail {
  job_id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  visibility: string;
  status: string;
  description_html: string;
  requirements_text: string;
  salary_range?: { min: number; max: number; currency: string };
  published_at: string | null;
}

interface Pipeline {
  stages: Array<{ stage_id: string; name: string; order: number }>;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const { can } = useMembership();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState<"publish" | "close" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const jobId = params.jobId as string;

  useEffect(() => {
    async function fetchJob() {
      const token = await getToken();
      if (!token || !tenantId) return;

      const res = await fetch(`/api/jobs/${jobId}?tenant_id=${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
        setPipeline(data.pipeline);
      }
      setLoading(false);
    }
    fetchJob();
  }, [jobId, tenantId, getToken]);

  const handleAction = async (action: "publish" | "close") => {
    setActionLoading(true);
    const token = await getToken();
    if (!token || !tenantId) return;

    const res = await fetch(`/api/jobs/${jobId}/${action}?tenant_id=${tenantId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });

    if (res.ok) {
      const data = await res.json();
      setJob((prev) => (prev ? { ...prev, status: data.status } : prev));
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (!job) return <div>Job not found</div>;

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-700",
    open: "bg-green-100 text-green-700",
    paused: "bg-yellow-100 text-yellow-700",
    closed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <Badge className={statusColors[job.status]}>{job.status}</Badge>
            {job.visibility === "public" ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {job.department} &middot; {job.location}
          </p>
        </div>
        <div className="flex gap-2">
          {can("create_edit_jobs") && (
            <>
              {(job.status === "draft" || job.status === "paused") && (
                <Button onClick={() => setConfirmAction("publish")}>
                  <Play className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              )}
              {job.status !== "closed" && (
                <Button variant="outline" onClick={() => setConfirmAction("close")}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Close
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push(`/jobs/${jobId}/edit`)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="pt-4">
          {pipeline ? (
            <PipelineBoard
              stages={pipeline.stages}
              applications={[]}
              onApplicationClick={(id) => router.push(`/candidates/${id}`)}
            />
          ) : (
            <p className="text-muted-foreground">No pipeline configured</p>
          )}
        </TabsContent>
        <TabsContent value="details" className="pt-4 max-w-3xl space-y-6">
          {job.salary_range && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Salary Range</h3>
              <p>
                {job.salary_range.currency} {job.salary_range.min.toLocaleString()} -{" "}
                {job.salary_range.max.toLocaleString()}
              </p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Description</h3>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: job.description_html }} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Requirements</h3>
            <p className="whitespace-pre-wrap text-sm">{job.requirements_text}</p>
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmAction === "publish"}
        onOpenChange={() => setConfirmAction(null)}
        title="Publish Job"
        description="This will make the job visible on your career page and start accepting applications."
        confirmLabel="Publish"
        onConfirm={() => handleAction("publish")}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirmAction === "close"}
        onOpenChange={() => setConfirmAction(null)}
        title="Close Job"
        description="This will stop accepting new applications. Existing applications will not be affected."
        confirmLabel="Close Job"
        variant="destructive"
        onConfirm={() => handleAction("close")}
        loading={actionLoading}
      />
    </div>
  );
}
