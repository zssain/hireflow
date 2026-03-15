"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobForm } from "@/components/jobs/job-form";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";

export default function NewJobPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (data: Record<string, unknown>) => {
    setLoading(true);
    setError("");

    try {
      const token = await getToken();
      if (!token || !tenantId) return;

      const body: Record<string, unknown> = {
        tenant_id: tenantId,
        title: data.title,
        department: data.department,
        location: data.location,
        employment_type: data.employment_type,
        visibility: data.visibility,
        description_html: data.description_html,
        requirements_text: data.requirements_text,
        pipeline_template_id: "default",
      };

      if (data.salary_min && data.salary_max) {
        body.salary_range = {
          min: data.salary_min,
          max: data.salary_max,
          currency: data.salary_currency || "USD",
        };
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to create job");
      }

      const result = await res.json();
      router.push(`/jobs/${result.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create New Job</h1>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <JobForm onSubmit={handleSubmit} loading={loading} submitLabel="Create Job" />
    </div>
  );
}
