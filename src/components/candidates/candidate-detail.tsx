"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreBadge } from "./score-badge";
import { Separator } from "@/components/ui/separator";

interface ProcessingData {
  rule_score: { skills: number; experience: number; keywords: number; education: number; bonus: number; total: number };
  ai_summary: string;
  strengths: string[];
  gaps: string[];
  confidence: number;
  structured_data: {
    name: string;
    email: string;
    phone: string;
    skills: string[];
    experience: Array<{ company: string; title: string; duration_text: string }>;
    education: Array<{ degree: string; institution: string; year?: number }>;
  };
}

interface CandidateDetailProps {
  candidateName: string;
  candidateEmail: string;
  scoreTotal: number | null;
  scoreStatus: string;
  processing: ProcessingData | null;
}

export function CandidateDetail({
  candidateName,
  candidateEmail,
  scoreTotal,
  scoreStatus,
  processing,
}: CandidateDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{candidateName}</h2>
          <p className="text-sm text-muted-foreground">{candidateEmail}</p>
        </div>
        <ScoreBadge score={scoreTotal} status={scoreStatus} size="md" />
      </div>

      {processing && (
        <>
          {/* Score Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {Object.entries(processing.rule_score)
                  .filter(([key]) => key !== "total")
                  .map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-2xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground capitalize">{key}</p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Summary */}
          {processing.ai_summary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">{processing.ai_summary}</p>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                    <ul className="space-y-1">
                      {processing.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-muted-foreground">+ {s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">Gaps</h4>
                    <ul className="space-y-1">
                      {processing.gaps.map((g, i) => (
                        <li key={i} className="text-sm text-muted-foreground">- {g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skills */}
          {processing.structured_data.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {processing.structured_data.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          {processing.structured_data.experience.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Experience</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {processing.structured_data.experience.map((exp, i) => (
                    <div key={i}>
                      <p className="text-sm font-medium">{exp.title}</p>
                      {exp.company && <p className="text-xs text-muted-foreground">{exp.company}</p>}
                      {exp.duration_text && <p className="text-xs text-muted-foreground">{exp.duration_text}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
