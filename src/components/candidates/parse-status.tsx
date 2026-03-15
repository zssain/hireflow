"use client";

import { CheckCircle2, AlertTriangle, XCircle, Clock, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParseStatusProps {
  status: string;
  manualReviewRequired?: boolean;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  uploaded: { label: "Uploaded", icon: Clock, className: "bg-zinc-100 text-zinc-700" },
  processing: { label: "Processing", icon: Clock, className: "bg-blue-100 text-blue-700" },
  processed: { label: "Processed", icon: CheckCircle2, className: "bg-green-100 text-green-700" },
  partial_success: { label: "Partial", icon: AlertTriangle, className: "bg-yellow-100 text-yellow-700" },
  low_confidence: { label: "Low Confidence", icon: AlertTriangle, className: "bg-orange-100 text-orange-700" },
  failed: { label: "Failed", icon: XCircle, className: "bg-red-100 text-red-700" },
  needs_manual_review: { label: "Needs Review", icon: Eye, className: "bg-purple-100 text-purple-700" },
};

export function ParseStatus({ status, manualReviewRequired }: ParseStatusProps) {
  const config = statusConfig[status] ?? statusConfig.uploaded;
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className={config.className}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
      {manualReviewRequired && status !== "needs_manual_review" && (
        <Badge variant="outline" className="text-xs">
          <Eye className="mr-1 h-3 w-3" />
          Review
        </Badge>
      )}
    </div>
  );
}
