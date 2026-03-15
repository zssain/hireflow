"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CandidateDetail } from "@/components/candidates/candidate-detail";
import { ParseStatus } from "@/components/candidates/parse-status";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useTenant } from "@/hooks/use-tenant";
import { useMembership } from "@/hooks/use-membership";

interface ApplicationData {
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  job_id: string;
  job_title: string;
  current_stage_id: string;
  current_stage_name: string;
  status: string;
  score_total: number | null;
  score_status: string;
  parse_status: string;
  manual_review_required: boolean;
  source_type: string;
}

interface PipelineStage {
  stage_id: string;
  name: string;
  order: number;
}

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const { tenantId } = useTenant();
  const { can } = useMembership();
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [processing, setProcessing] = useState<Record<string, unknown> | null>(null);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  const applicationId = params.applicationId as string;

  useEffect(() => {
    async function fetchData() {
      const token = await getToken();
      if (!token || !tenantId) return;

      // Fetch application + scoring data
      const [appRes, scoreRes] = await Promise.all([
        globalThis.fetch(`/api/applications?tenant_id=${tenantId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        globalThis.fetch("/api/scoring/run", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ tenant_id: tenantId, application_id: applicationId }),
        }),
      ]);

      if (appRes.ok) {
        const data = await appRes.json();
        const app = data.applications.find((a: ApplicationData) => a.application_id === applicationId);
        if (app) {
          setApplication(app);
          // Fetch pipeline stages
          const jobRes = await globalThis.fetch(`/api/jobs/${app.job_id}?tenant_id=${tenantId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (jobRes.ok) {
            const jobData = await jobRes.json();
            setStages(jobData.pipeline?.stages ?? []);
          }
        }
      }

      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        setProcessing(scoreData.processing);
      }

      setLoading(false);
    }
    fetchData();
  }, [applicationId, tenantId, getToken]);

  const handleStageChange = async (stageId: string) => {
    const token = await getToken();
    if (!token || !tenantId) return;

    const res = await globalThis.fetch(`/api/applications/${applicationId}/move-stage`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, target_stage_id: stageId }),
    });

    if (res.ok) {
      const data = await res.json();
      setApplication((prev) =>
        prev ? { ...prev, current_stage_id: data.new_stage_id, current_stage_name: data.new_stage_name } : prev
      );
    }
  };

  if (loading) return <LoadingSkeleton variant="detail" />;
  if (!application) return <div className="flex min-h-[400px] items-center justify-center text-muted-foreground">Application not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/candidates")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{application.candidate_name}</h1>
          <p className="text-sm text-muted-foreground">
            {application.job_title} &middot; {application.source_type.replace("_", " ")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ParseStatus status={application.parse_status} manualReviewRequired={application.manual_review_required} />
          <Badge variant={application.status === "active" ? "default" : "secondary"}>
            {application.status}
          </Badge>
        </div>
      </div>

      {/* Stage selector */}
      {can("move_pipeline_stages") && stages.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Stage:</span>
          <Select value={application.current_stage_id} onValueChange={handleStageChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages
                .sort((a, b) => a.order - b.order)
                .map((stage) => (
                  <SelectItem key={stage.stage_id} value={stage.stage_id}>
                    {stage.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <CandidateDetail
        candidateName={application.candidate_name}
        candidateEmail={application.candidate_email}
        scoreTotal={application.score_total}
        scoreStatus={application.score_status}
        processing={processing as never}
      />
    </div>
  );
}
