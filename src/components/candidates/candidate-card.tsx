"use client";

import Link from "next/link";
import { Mail, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreBadge } from "./score-badge";
import { ParseStatus } from "./parse-status";

interface CandidateCardProps {
  applicationId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  currentStageName: string;
  scoreTotal: number | null;
  scoreStatus: string;
  parseStatus: string;
  manualReviewRequired: boolean;
}

export function CandidateCard({
  applicationId,
  candidateName,
  candidateEmail,
  jobTitle,
  currentStageName,
  scoreTotal,
  scoreStatus,
  parseStatus,
  manualReviewRequired,
}: CandidateCardProps) {
  return (
    <Link href={`/candidates/${applicationId}`}>
      <Card className="cursor-pointer transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-medium">{candidateName}</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {candidateEmail}
                </span>
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" />
                  {jobTitle}
                </span>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {currentStageName}
                </span>
                <ParseStatus status={parseStatus} manualReviewRequired={manualReviewRequired} />
              </div>
            </div>
            <ScoreBadge score={scoreTotal} status={scoreStatus} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
