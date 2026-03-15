"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/jobs/job-form";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [job, setJob] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      }
      setLoading(false);
    }
    fetchJob();
  }, [jobId, tenantId, getToken]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    setSaving(true);
    setError("");

    try {
      const token = await getToken();
      if (!token || !tenantId) return;

      const body: Record<string, unknown> = {
        tenant_id: tenantId,
        ...data,
      };

      if (data.salary_min && data.salary_max) {
        body.salary_range = {
          min: data.salary_min,
          max: data.salary_max,
          currency: data.salary_currency || "USD",
        };
      }

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to update job");
      }

      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (!job) return <div>Job not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Job</h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <JobForm
        defaultValues={{
          title: job.title as string,
          department: job.department as string,
          location: job.location as string,
          employment_type: job.employment_type as "full_time",
          visibility: job.visibility as "public",
          description_html: job.description_html as string,
          requirements_text: job.requirements_text as string,
        }}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Save Changes"
      />
    </div>
  );
}
