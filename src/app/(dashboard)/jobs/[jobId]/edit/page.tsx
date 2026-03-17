"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/jobs/job-form";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useApiQuery, invalidateCache } from "@/hooks/use-api-query";

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const jobId = params.jobId as string;

  const { data: jobData, loading } = useApiQuery<Record<string, unknown>>(
    `/jobs/${jobId}`,
    { transform: (raw: unknown) => (raw as { job: Record<string, unknown> }).job }
  );

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

      invalidateCache("/jobs");
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update job");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (!jobData) return <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">Job not found</div>;

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
          title: jobData.title as string,
          department: jobData.department as string,
          location: jobData.location as string,
          employment_type: jobData.employment_type as "full_time",
          visibility: jobData.visibility as "public",
          description_html: jobData.description_html as string,
          requirements_text: jobData.requirements_text as string,
        }}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Save Changes"
      />
    </div>
  );
}
